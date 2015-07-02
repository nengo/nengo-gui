import importlib
import json
import logging
import os
import socket
import threading
import time
import traceback

import nengo

import nengo_gui
import nengo_gui.components.action

logger = logging.getLogger(__name__)


class Sim(object):
    """A single Simulator attached to an html visualization."""

    singleton_sims = dict(nengo_spinnaker = None)

    def __init__(self, sim_server, filename,
                       reset_cfg=False):
        self.sim_server = sim_server
        self.backend = sim_server.backend

        self.code = None
        self.model = None
        self.locals = None

        self.changed = False
        self.new_code = None
        self.paused = False
        self.finished = False
        self._sim = None
        self.rebuild = False

        self.undo_stack = []
        self.redo_stack = []

        self.config_save_period = 2.0  # minimum time between saves

        self.lock = threading.Lock()

        if filename is None:
            self.filename = sim_server.filename
        else:
            self.filename = os.path.relpath(filename)

        if sim_server.filename_cfg is None:
            self.filename_cfg = self.filename + '.cfg'
        else:
            self.filename_cfg = sim_server.filename_cfg

        if reset_cfg:
            self.clear_config()
        self.load()

        self.net_graph = self.get_net_graph()

        # build and run the model in a separate thread
        t = threading.Thread(target=self.runner)
        t.daemon = True
        t.start()

    @property
    def sim(self):
        return self._sim

    @sim.setter
    def sim(self, value):
        if hasattr(self._sim, 'close'):
            self._sim.close()
        self._sim = value


    def get_net_graph(self):
        for c in self.components:
            if isinstance(c, nengo_gui.components.NetGraph):
                return c
        return None

    def clear_config(self):
        if os.path.isfile(self.filename_cfg) :
            os.remove(self.filename_cfg)


    def load(self, code=None):
        if self.filename == self.sim_server.filename:
            self.model = self.sim_server.model
            self.locals = self.sim_server.locals
        else:
            self.model = None
            self.locals = None

        if self.locals is None:
            if code is None:
                try:
                    with open(self.filename) as f:
                        code = f.read()
                except IOError:
                    code = ''

            self.execute(code)

        if self.model is None:
            self.model = nengo.Network()
            self.locals['model'] = self.model

        self.name_finder = nengo_gui.NameFinder(self.locals, self.model)
        self.default_labels = self.name_finder.known_name

        self.config = self.load_config()
        self.config_save_needed = False
        self.config_save_time = None   # time of last config file save

        self.uid_prefix_counter = {}

        self.create_components()

    def create_components(self):
        self.templates = []   #TODO: do I need this list?
        self.components = []
        self.template_uids = {}
        for k, v in self.locals.items():
            if isinstance(v, nengo_gui.components.component.Template):
                self.template_uids[v] = k
                c = v.create(self)
                self.sim_server.component_uids[c.uid] = c
                self.templates.append(v)
                self.components.append(c)

        self.components.sort(key=lambda x: x.z_order)

    def add_template(self, template):
        c = template.create(self)
        self.sim_server.component_uids[c.uid] = c

        self.templates.append(template)
        self.components.append(c)

        return c



    def execute(self, code):
        locals = {}
        locals['nengo_gui'] = nengo_gui
        locals['__file__'] = self.filename

        self.code = code
        self.error = None
        self.stdout = ''

        #TODO: adjust monkey patch to add file dir to sys.path


        patch = nengo_gui.monkey.Patch(self.filename)
        try:
            with patch:
                exec(code, locals)
        except nengo_gui.monkey.StartedSimulatorException:
            pass
        except nengo_gui.monkey.StartedVizException:
            pass
        except:
            line = nengo_gui.monkey.determine_line_number()
            self.error = dict(trace=traceback.format_exc(), line=line)
        self.stdout = patch.stdout.getvalue()

        model = locals.get('model', None)
        if not isinstance(model, nengo.Network):
            if self.error is None:
                line = len(code.split('\n'))
                self.error = dict(trace='must declare a nengo.Network '
                                    'called "model"', line=line)
            model = None

        self.model = model
        self.locals = locals


    def load_config(self):
        config = nengo_gui.config.Config()
        self.locals['nengo_gui'] = nengo_gui
        self.locals['_viz_config'] = config
        fname = self.filename_cfg
        if os.path.exists(fname):
            with open(fname) as f:
                config_code = f.readlines()
            for line in config_code:
                try:
                    exec(line, self.locals)
                except Exception as e:
                    if self.sim_server.interactive:
                        logging.debug('error parsing config: %s' % line)

        # make sure a SimControl and a NetGraph exist
        if '_viz_sim_control' not in self.locals:
            template = nengo_gui.components.SimControlTemplate()
            self.locals['_viz_sim_control'] = template
        if '_viz_net_graph' not in self.locals:
            template = nengo_gui.components.NetGraphTemplate()
            self.locals['_viz_net_graph'] = template
        if '_viz_ace_editor' not in self.locals:
            template = nengo_gui.components.AceEditorTemplate()
            self.locals['_viz_ace_editor'] = template

        if self.model is not None:
            if config[self.model].pos is None:
                config[self.model].pos = (0, 0)
            if config[self.model].size is None:
                config[self.model].size = (1.0, 1.0)

        for k, v in self.locals.items():
            if isinstance(v, nengo_gui.components.component.Template):
                self.default_labels[v] = k

        return config

    def save_config(self, lazy=False, force=False):
        if not force and not self.config_save_needed:
            return

        now_time = time.time()
        if not force and lazy and self.config_save_time is not None:
            if (now_time - self.config_save_time) < self.config_save_period:
                return

        with self.lock:
            self.config_save_time = now_time
            self.config_save_needed = False
            try:
                with open(self.filename_cfg, 'w') as f:
                    f.write(self.config.dumps(uids=self.default_labels))
            except IOError:
                print("Could not save %s; permission denied" %
                      self.filename_cfg)

    def modified_config(self):
        self.config_save_needed = True


    def create_javascript(self):
        fn = json.dumps(self.filename[:-3])
        webpage_title_js = ';document.title = %s;' % fn

        ##Ensure that sim control is first
        temp = self.components[0]
        counter = 0
        for t in self.components:
            if isinstance(t, nengo_gui.components.SimControl):
                self.components[0] = t
                self.components[counter] = temp
                break
            counter += 1

        component_js = '\n'.join([c.javascript() for c in self.components])
        component_js += webpage_title_js
        if not self.sim_server.allow_file_change:
            component_js += "$('#Open_file_button').addClass('deactivated');"
            pass
        return component_js

    def get_label(self, obj, default_labels=None, full=False):
        if default_labels is None:
            default_labels = self.default_labels
        label = obj.label
        if label is None:
            label = default_labels.get(obj, None)
            if label is None:
                raise Exception('ERROR finding label: %s' % obj)
            else:
                if not full and '.' in label:
                    label = label.rsplit('.', 1)[1]
        if label is None:
            label = repr(obj)
        return label

    def get_uid(self, obj, default_labels=None):
        if default_labels is None:
            default_labels = self.default_labels
        uid = default_labels.get(obj, None)
        if uid is None:
            uid = repr(obj)
        return uid

    def finish(self):
        if not self.finished:
            self.finished = True
            self.sim_server.remove_sim(self)

    def generate_uid(self, obj, prefix):
        index = self.uid_prefix_counter.get(prefix, 0)
        uid = '%s%d' % (prefix, index)
        while uid in self.locals:
            index += 1
            uid = '%s%d' % (prefix, index)
        self.uid_prefix_counter[prefix] = index + 1

        self.locals[uid] = obj
        self.default_labels[obj] = uid

    def remove_uid(self, uid):
        if uid in self.locals:
            obj = self.locals[uid]
            del self.locals[uid]
            del self.default_labels[obj]
        else:
            print 'WARNING: remove_uid called on unknown uid', uid

    def remove_component(self, component):
        del self.sim_server.component_uids[component.uid]
        template = component.template
        uid = self.get_uid(template)
        self.remove_uid(uid)
        self.components.remove(component)
        self.templates.remove(template)


    def config_change(self, component, new_cfg, old_cfg):
        act = nengo_gui.components.action.ConfigAction(self,
                component=component, new_cfg=new_cfg, old_cfg=old_cfg)
        self.undo_stack.append([act])

    def remove_graph(self, component):
        act = nengo_gui.components.action.RemoveGraph(
                self.net_graph, component)
        self.undo_stack.append([act])


    def build(self):
        # use the lock to make sure only one Simulator is building at a time
        with self.lock:
            self.building = True

            for c in self.components:
                c.add_nengo_objects(self)
            # build the simulation
            backend = importlib.import_module(self.backend)
            old_sim = Sim.singleton_sims.get(self.backend, None)
            if old_sim is not None:
                if old_sim is not self:
                    old_sim.sim = None
                    old_sim.finished = True
            self.sim = backend.Simulator(self.model)
            if self.backend in Sim.singleton_sims:
                Sim.singleton_sims[self.backend] = self

            # remove the temporary components added for visualization
            for c in self.components:
                c.remove_nengo_objects(self)
            # TODO: add checks to make sure everything's been removed

            self.building = False
            self.rebuild = False

    def runner(self):
        # run the simulation
        while not self.finished:
            if self.sim is None:
                time.sleep(0.01)
            else:
                try:
                    if hasattr(self.sim, 'max_steps'):
                        self.sim.run_steps(self.sim.max_steps)
                    else:
                        self.sim.step()
                except socket.error:  # if another thread closes the sim
                    pass


            if self.rebuild:
                self.build()












