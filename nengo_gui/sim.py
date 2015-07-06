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
import nengo_gui.config


class Sim(object):
    """A single Simulator attached to an html visualization.

    Parameters
    ----------

    sim_server : nengo_gui.SimServer
        The master SimServer
    filename : str
        The filename to open.  If this is the same as sim_server.filename
        then it will use the existing sim_server.model and sim_server.locals
        (if available).  Otherwise, the file will be executed to generate
        the model
    reset_cfg : bool, optional
        If True, the existing .cfg file will be erased
    """

    # Some Simulators can only have one instance running at a time
    singleton_sims = dict(nengo_spinnaker=None)

    def __init__(self, sim_server, filename, reset_cfg=False):
        self.sim_server = sim_server
        self.backend = sim_server.backend

        self.code = None     # the code for the model
        self.model = None    # the nengo.Network
        self.locals = None   # the locals() dictionary after executing

        self.changed = False   # has the model been changed?
        self.paused = False    # is the simulation paused
        self.finished = False  # should this Sim be shut down
        self._sim = None       # the current nengo.Simulator
        self.rebuild = False   # should the model be rebuilt

        self.undo_stack = []
        self.redo_stack = []

        self.config_save_period = 2.0  # minimum time between saves

        self.lock = threading.Lock()

        # use the default filename if none is given
        if filename is None:
            self.filename = sim_server.filename
        else:
            self.filename = os.path.relpath(filename)

        # determine the .cfg filename
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
        if os.path.isfile(self.filename_cfg):
            os.remove(self.filename_cfg)

    def load(self):
        """Load the model and initialize everything"""
        if self.filename == self.sim_server.filename:
            # if we're on the default filenaem, just load it from the SimServer
            self.model = self.sim_server.model
            if self.sim_server.locals is None:
                self.locals = None
            else:
                self.locals = self.sim_server.locals.copy()
        else:
            self.model = None
            self.locals = None

        # if we still don't have a locals dictionary, then run the script
        if self.locals is None:
            try:
                with open(self.filename) as f:
                    code = f.read()
            except IOError:
                code = ''

            self.execute(code)

        if self.model is None:
            self.model = nengo.Network()
            self.locals['model'] = self.model

        # figure out good names for objects
        self.name_finder = nengo_gui.NameFinder(self.locals, self.model)
        self.default_labels = self.name_finder.known_name

        # load the .cfg file
        self.config = self.load_config()
        self.config_save_needed = False
        self.config_save_time = None   # time of last config file save

        self.uid_prefix_counter = {}

        self.create_components()

    def create_components(self):
        """Generate the actual Components from the Templates"""
        self.components = []
        self.template_uids = {}
        for k, v in self.locals.items():
            if isinstance(v, nengo_gui.components.component.Template):
                self.template_uids[v] = k
                c = v.create(self)
                self.sim_server.component_uids[c.uid] = c
                self.components.append(c)

        # this ensures NetGraph, AceEditor, and SimControl are first
        self.components.sort(key=lambda x: x.component_order)

    def add_template(self, template):
        """Add a new Component to an existing Sim."""
        c = template.create(self)
        self.sim_server.component_uids[c.uid] = c

        self.components.append(c)

        return c

    def execute(self, code):
        """Run the given code to generate self.model and self.locals.

        The code will be stored in self.code, any output to stdout will
        be a string as self.stdout, and any error will be in self.error.
        """
        locals = {}
        locals['nengo_gui'] = nengo_gui
        locals['__file__'] = self.filename

        self.code = code
        self.error = None
        self.stdout = ''

        patch = nengo_gui.monkey.Patch(self.filename)
        try:
            with patch:
                exec(code, locals)
        except nengo_gui.monkey.StartedSimulatorException:
            line = nengo_gui.monkey.determine_line_number()
            patch.stdout.write('Warning: Simulators cannot be manually'
                               ' run inside nengo_gui (line %d)\n' % line)
        except nengo_gui.monkey.StartedVizException:
            line = nengo_gui.monkey.determine_line_number()
            patch.stdout.write('Warning: nengo_gui cannot be run inside'
                               ' nengo_gui (line %d)\n' % line)
        except:
            line = nengo_gui.monkey.determine_line_number()
            self.error = dict(trace=traceback.format_exc(), line=line)
        self.stdout = patch.stdout.getvalue()

        # make sure we've defined a nengo.Network
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
        """Load the .cfg file"""
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
                except Exception:
                    if self.sim_server.interactive:
                        logging.debug('error parsing config: %s' % line)

        # make sure the required Components exist
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
        """Write the .cfg file to disk.

        Parameters
        ----------
        lazy : bool
            If True, then only save if it has been more than config_save_time
            since the last save and if config_save_needed
        force : bool
            If True, then always save right now
        """
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
        """Set a flag that the config file should be saved."""
        self.config_save_needed = True

    def create_javascript(self):
        """Generate the javascript for the current model and layout."""
        if self.filename is not None:
            fn = json.dumps(self.filename)
            webpage_title_js = ';document.title = %s;' % fn
        else:
            webpage_title_js = ''

        assert isinstance(self.components[0], nengo_gui.components.SimControl)

        component_js = '\n'.join([c.javascript() for c in self.components])
        component_js += webpage_title_js
        if not self.sim_server.allow_file_change:
            component_js += "$('#Open_file_button').addClass('deactivated');"
            pass
        return component_js

    def get_label(self, obj, default_labels=None):
        """Return a readable label for an object.

        If the object has a .label set, this will be used.  Otherwise, it
        uses default_labels, which thanks to the NameFinder will be legal
        Python code for referring to the object given the current locals()
        dictionary ("model.ensembles[1]" or "ens" or "model.buffer.state".
        If it has to use default_labels, it will only use the last part of the
        label (after the last ".").  This avoids redundancy in nested displays.
        """
        if default_labels is None:
            default_labels = self.default_labels
        label = obj.label
        if label is None:
            label = default_labels.get(obj, None)
            if label is None:
                raise Exception('ERROR finding label: %s' % obj)
            else:
                if '.' in label:
                    label = label.rsplit('.', 1)[1]
        if label is None:
            label = repr(obj)
        return label

    def get_uid(self, obj, default_labels=None):
        """Return a unique identifier for an object.

        This should be the value given by the NameFinder.
        """
        if default_labels is None:
            default_labels = self.default_labels
        uid = default_labels.get(obj, None)
        if uid is None:
            # TODO: do we ever need to fall back on this case?  This should
            # only happen if something goes wrong.
            uid = repr(obj)
        return uid

    def finish(self):
        """Shut down this simulator."""
        if not self.finished:
            self.finished = True
            self.sim_server.remove_sim(self)

    def generate_uid(self, obj, prefix):
        """Make a new unique identifier for an object.

        This is used for new Components being created (so they can have
        a unique identifier in the .cfg file).
        """
        index = self.uid_prefix_counter.get(prefix, 0)
        uid = '%s%d' % (prefix, index)
        while uid in self.locals:
            index += 1
            uid = '%s%d' % (prefix, index)
        self.uid_prefix_counter[prefix] = index + 1

        self.locals[uid] = obj
        self.default_labels[obj] = uid

    def remove_uid(self, uid):
        """Remove a generated uid (for when a component is removed)."""
        if uid in self.locals:
            obj = self.locals[uid]
            del self.locals[uid]
            del self.default_labels[obj]
        else:
            print 'WARNING: remove_uid called on unknown uid', uid

    def remove_component(self, component):
        """Remove a component from the layout."""
        del self.sim_server.component_uids[component.uid]
        template = component.template
        uid = self.get_uid(template)
        self.remove_uid(uid)
        self.components.remove(component)

    def config_change(self, component, new_cfg, old_cfg):
        act = nengo_gui.components.action.ConfigAction(self,
                                                       component=component,
                                                       new_cfg=new_cfg,
                                                       old_cfg=old_cfg)
        self.undo_stack.append([act])

    def remove_graph(self, component):
        act = nengo_gui.components.action.RemoveGraph(self.net_graph,
                                                      component)
        self.undo_stack.append([act])

    def build(self):
        """Build the model."""
        # use the lock to make sure only one Simulator is building at a time
        # TODO: should there be a master lock in the SimServer?
        with self.lock:
            self.building = True

            # modify the model for the various Components
            for c in self.components:
                c.add_nengo_objects(self)

            # determine the backend to use
            backend = importlib.import_module(self.backend)
            # if only one Simulator is allowed at a time, finish the old one
            old_sim = Sim.singleton_sims.get(self.backend, None)
            if old_sim is not None and old_sim is not self:
                old_sim.sim = None
                old_sim.finished = True

            # build the simulation
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
        """Separate thread for running the simulation itself."""
        # run the simulation
        while not self.finished:
            if self.sim is None:
                time.sleep(0.01)
            else:
                try:
                    if hasattr(self.sim, 'max_steps'):
                        # this is only for the nengo_spinnaker simulation
                        self.sim.run_steps(self.sim.max_steps)
                    else:
                        self.sim.step()
                except socket.error:  # if another thread closes the sim
                    pass

            if self.rebuild:
                self.build()
