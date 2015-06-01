import os
import time
import threading
import json

import nengo

import nengo_viz
import nengo_viz.server
import nengo_viz.components
import nengo_viz.config
from nengo_viz.components.action import ConfigAction, RemoveGraph
import nengo_viz.monkey


class VizSim(object):
    """A single Simulator attached to an html visualization."""
    def __init__(self, viz):
        self.viz = viz          # the parent Viz organizer
        self.config = viz.config
        self.model = viz.model
        self.building = True    # are we still building the model?
        self.components = []
        self.uids = {}
        self.finished = False   # are we done simulating?
        self.rebuild = False    # should we rebuild the model?
        self.sim = None
        self.changed = False    # has something changed the model, so it
        self.undo_stack = []
        self.redo_stack = []
                                #  should be rebuilt?

        for template in self.viz.find_templates():
            self.add_template(template)

        self.net_graph = self.get_net_graph()

        # build and run the model in a separate thread
        t = threading.Thread(target=self.runner)
        t.daemon = True
        t.start()

    def get_net_graph(self):
        for c in self.components:
            if isinstance(c, nengo_viz.components.NetGraph):
                return c
        return None

    def add_template(self, template):
        c = template.create(self)
        self.uids[c.uid] = c
        if isinstance(template, (nengo_viz.components.SimControlTemplate,
                                 nengo_viz.components.NetGraphTemplate,
                                 nengo_viz.components.AceEditorTemplate)):
            self.components[:0] = [c]
        else:
            self.components.append(c)
        return c

    def build(self):
        self.building = True

        self.sim = None

        # use the lock to make sure only one Simulator is building at a time
        with self.viz.lock:
            for c in self.components:
                c.add_nengo_objects(self.viz)
            # build the simulation
            self.sim = nengo.Simulator(self.model)
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
                    self.sim.step()
                except AttributeError:
                    time.sleep(0.01)


            if self.rebuild:
                self.rebuild = False
                self.build()

    def finish(self):
        self.finished = True
        self.viz.remove_sim(self)

    def create_javascript(self):
        fn = json.dumps(self.viz.filename[:-3])
        webpage_title_js = ';document.title = %s' % fn
        component_js = '\n'.join([c.javascript() for c in self.components])
        component_js = component_js + webpage_title_js
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
    def __init__(self, filename, model=None, locals=None):
        if nengo_viz.monkey.is_executing():
            raise nengo_viz.monkey.StartedVizException()

        self.viz_sims = []

        self.config_save_period = 2.0  # minimum time between saves
        self.load(filename, model, locals)

    def load(self, filename, model=None, locals=None):
        if locals is None:
            locals = {}
            locals['nengo_viz'] = nengo_viz
            locals['__file__'] = filename

            with open(filename) as f:
                code = f.read()
                self.code = code.split('\n')

            with nengo_viz.monkey.patch():
                try:
                    exec(code, locals)
                except nengo_viz.monkey.StartedSimulatorException:
                    line = nengo_viz.monkey.determine_line_number()
                    print('nengo.Simulator() started on line %d. '
                          'Ignoring all subsequent lines.' % line)
                except nengo_viz.monkey.StartedVizException:
                    line = nengo_viz.monkey.determine_line_number()
                    print('nengo_viz.Viz() started on line %d. '
                          'Ignoring all subsequent lines.' % line)

        if model is None:
            if 'model' not in locals:
                raise VizException('No object called "model" in the code')
            model = locals['model']
            if not isinstance(model, nengo.Network):
                raise VizException('The "model" must be a nengo.Network')



        self.model = model
        self.locals = locals

        self.filename = filename
        self.name_finder = nengo_viz.NameFinder(locals, model)
        self.default_labels = self.name_finder.known_name

        self.config = self.load_config()
        self.config_save_needed = False
        self.config_save_needed = False
        self.config_save_time = None   # time of last config file save

        self.lock = threading.Lock()

        self.uid_prefix_counter = {}

    def find_templates(self):
        for k, v in self.locals.items():
            if isinstance(v, nengo_viz.components.component.Template):
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
        obj = self.locals[uid]
        del self.locals[uid]
        del self.default_labels[obj]

    def config_name(self):
        return self.filename + '.cfg'

    def load_config(self):
        config = nengo_viz.config.Config()
        self.locals['_viz_config'] = config
        fname = self.config_name()
        if os.path.exists(fname):
            with open(fname) as f:
                config_code = f.readlines()
            for line in config_code:
                try:
                    exec(line, self.locals)
                except Exception as e:
                    print('error parsing config', line, e)

        # make sure a SimControl and a NetGraph exist
        if '_viz_sim_control' not in self.locals:
            template = nengo_viz.components.SimControlTemplate()
            self.locals['_viz_sim_control'] = template
        if '_viz_net_graph' not in self.locals:
            template = nengo_viz.components.NetGraphTemplate()
            self.locals['_viz_net_graph'] = template
        if '_viz_ace_editor' not in self.locals:
            template = nengo_viz.components.AceEditorTemplate()
            self.locals['_viz_ace_editor'] = template

        if config[self.model].pos is None:
            config[self.model].pos = (0, 0)
        if config[self.model].size is None:
            config[self.model].size = (1.0, 1.0)

        for k, v in self.locals.items():
            if isinstance(v, nengo_viz.components.component.Template):
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

    def start(self, port=8080, browser=True):
        """Start the web server"""
        nengo_viz.server.Server.viz = self
        print("Starting nengo_viz server at http://localhost:%d" % port)
        nengo_viz.server.Server.start(port=port, browser=browser)

    def create_sim(self):
        """Create a new Simulator with this configuration"""
        viz_sim = VizSim(self)
        self.viz_sims.append(viz_sim)
        return viz_sim

    def remove_sim(self, viz_sim):
        self.viz_sims.remove(viz_sim)

    def count_sims(self):
        return len(self.viz_sims)
