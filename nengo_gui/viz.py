import importlib
import os
import time
import threading
import json
import socket

import nengo

import nengo_gui
import nengo_gui.server
import nengo_gui.components
import nengo_gui.config
from nengo_gui.components.action import ConfigAction, RemoveGraph
import nengo_gui.monkey


class VizException(Exception):
    pass


class VizSim(object):
    """A single Simulator attached to an html visualization."""

    # list of backends that can only have one Simulator at a time
    singleton_sims = dict(nengo_spinnaker = None)

    def __init__(self, viz):
        self.viz = viz          # the parent Viz organizer
        self.config = viz.config
        self.model = viz.model
        self.building = True    # are we still building the model?
        self.components = []
        self.uids = {}
        self.finished = False   # are we done simulating?
        self.rebuild = False    # should we rebuild the model?
        self._sim = None
        self.changed = False    # has something changed the model, so it
        self.current_error = None
        self.undo_stack = []
        self.redo_stack = []
        self.backend = viz.default_backend
        self.new_code = None
                                #  should be rebuilt?

        for template in self.viz.find_templates():
            self.add_template(template)

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

    def add_template(self, template):
        c = template.create(self)
        self.uids[c.uid] = c
        if isinstance(template, (nengo_gui.components.SimControlTemplate,
                                 nengo_gui.components.NetGraphTemplate,
                                 nengo_gui.components.AceEditorTemplate)):
            self.components[:0] = [c]
        else:
            self.components.append(c)
        return c

    def build(self):
        self.building = True

        # use the lock to make sure only one Simulator is building at a time
        with self.viz.lock:
            for c in self.components:
                c.add_nengo_objects(self.viz)
            # build the simulation
            backend = importlib.import_module(self.backend)
            old_sim = VizSim.singleton_sims.get(self.backend, None)
            if old_sim is not None:
                if old_sim is not self:
                    old_sim.sim = None
                    old_sim.finished = True
            self.sim = backend.Simulator(self.model)
            if self.backend in VizSim.singleton_sims:
                VizSim.singleton_sims[self.backend] = self

            # remove the temporary components added for visualization
            for c in self.components:
                c.remove_nengo_objects(self.viz)
            # TODO: add checks to make sure everything's been removed


        self.building = False

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
                except AttributeError:
                    time.sleep(0.01)
                except socket.error:  # if another thread closes the sim
                    pass


            if self.rebuild:
                self.rebuild = False
                self.build()


    def finish(self):
        self.finished = True
        self.viz.remove_sim(self)

    def create_javascript(self):
        fn = json.dumps(self.viz.filename[:-3])
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
        if not self.viz.allow_file_change:
            component_js += "$('#Open_file_button').addClass('deactivated');"
            pass
        return component_js

    def config_change(self, component, new_cfg, old_cfg):
        act = ConfigAction(self, component=component,
                           new_cfg=new_cfg, old_cfg=old_cfg)
        self.undo_stack.append([act])

    def remove_graph(self, component):
        net_graph = self.get_net_graph()
        act = RemoveGraph(net_graph, component)
        self.undo_stack.append([act])

class Viz(object):
    """The master visualization organizer set up for a particular model."""
    def __init__(
            self, filename=None, model=None, locals=None, cfg=None,
            interactive=True, allow_file_change=True):
        if nengo_gui.monkey.is_executing():
            raise nengo_gui.monkey.StartedVizException()

        self.allow_file_change = allow_file_change

        self.viz_sims = []
        self.cfg = cfg
        self.interactive = interactive
        self.default_backend = 'nengo'

        self.lock = threading.Lock()

        self.config_save_period = 2.0  # minimum time between saves

        if filename is None:
            filename = os.path.join(nengo_gui.__path__[0],
                                    'examples',
                                    'default.py')

        self.load(filename, model, locals, force=True)

    def load(self, filename, model=None, locals=None, force=False,
             reset=False):
        with self.lock:
            try:
                filename = os.path.relpath(filename)
            except ValueError:
                pass

            if locals is None:
                locals = {}
                locals['nengo_gui'] = nengo_gui
                locals['__file__'] = filename

                try:
                    with open(filename) as f:
                        self.code = f.read()
                except IOError:
                    self.code = ('import nengo\n\n'
                                'model = nengo.Network()\n'
                                'with model:\n'
                                '    ')

                with nengo_gui.monkey.patch():
                    try:
                        exec(self.code, locals)
                    except nengo_gui.monkey.StartedSimulatorException:
                        if self.interactive:
                            line = nengo_gui.monkey.determine_line_number()
                            print('nengo.Simulator() started on line %d. '
                                  'Ignoring all subsequent lines.' % line)
                    except nengo_gui.monkey.StartedVizException:
                        if self.interactive:
                            line = nengo_gui.monkey.determine_line_number()
                            print('nengo_gui.Viz() started on line %d. '
                                  'Ignoring all subsequent lines.' % line)
                    except:
                        if not force:
                            raise
            self.orig_locals = dict(locals)

            if model is None:
                if 'model' not in locals:
                    if force:
                        locals['model'] = nengo.Network()
                    else:
                        raise VizException('No object called "model" in the code')
                model = locals['model']
                if not isinstance(model, nengo.Network):
                    if force:
                        locals['model'] = nengo.Network()
                        model = locals['model']
                    else:
                        raise VizException('The "model" must be a nengo.Network')



            self.model = model
            self.locals = dict(locals)

            self.filename = filename
            self.name_finder = nengo_gui.NameFinder(locals, model)
            self.default_labels = self.name_finder.known_name

            if reset:
                if os.path.isfile(self.config_name()) :
                    os.remove(self.config_name())

            self.config = self.load_config()
            self.config_save_needed = False
            self.config_save_time = None   # time of last config file save


            self.uid_prefix_counter = {}

    def find_templates(self):
        for k, v in self.locals.items():
            if isinstance(v, nengo_gui.components.component.Template):
                yield v

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

    def config_name(self):
        if self.cfg is None:
            return self.filename + '.cfg'
        else:
            return self.cfg

    def load_config(self):
        config = nengo_gui.config.Config()
        self.locals['nengo_gui'] = nengo_gui
        self.locals['_viz_config'] = config
        fname = self.config_name()
        if os.path.exists(fname):
            with open(fname) as f:
                config_code = f.readlines()
            for line in config_code:
                try:
                    exec(line, self.locals)
                except Exception as e:
                    if self.interactive:
                        print('error parsing config', line, e)

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
            with open(self.config_name(), 'w') as f:
                f.write(self.config.dumps(uids=self.default_labels))

    def modified_config(self):
        self.config_save_needed = True

    def get_label(self, obj, default_labels=None):
        if default_labels is None:
            default_labels = self.default_labels
        label = obj.label
        if label is None:
            label = default_labels.get(obj, None)
            if label is None:
                print('ERROR finding label: %s' % obj)
            else:
                if '.' in label:
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

    def start(self, port=8080, browser=True, password=None):
        """Start the web server"""
        print("Starting nengo_gui server at http://localhost:%d" % port)
        if password is not None:
            nengo_gui.server.Server.add_user('', password)
            addr = ''
        else:
            addr = 'localhost'
        nengo_gui.server.Server.start(self, port=port, browser=browser, addr=addr)

    def prepare_server(self, viz, port=8080, browser=True):
        return nengo_gui.server.Server.prepare_server(
            self, port=port, browser=browser)

    def begin_lifecycle(self, server):
        nengo_gui.server.Server.begin_lifecycle(
            server, interactive=self.interactive)

    def create_sim(self):
        """Create a new Simulator with this configuration"""
        viz_sim = VizSim(self)
        self.viz_sims.append(viz_sim)
        return viz_sim

    def remove_sim(self, viz_sim):
        self.viz_sims.remove(viz_sim)

    def count_sims(self):
        return len(self.viz_sims)
