import time
import threading

import nengo

import nengo_viz
import nengo_viz.server
import nengo_viz.components
import nengo_viz.config
from nengo_viz.namefinder import ModelManager


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
                                #  should be rebuilt?

        for template in self.viz.find_templates():
            self.add_template(template)

        # build and run the model in a separate thread
        t = threading.Thread(target=self.runner)
        t.daemon = True
        t.start()

    def add_template(self, template):
        c = template.create(self)
        self.uids[c.uid] = c
        if isinstance(template, (nengo_viz.components.SimControlTemplate,
                                 nengo_viz.components.NetGraphTemplate)):
            self.components[:0] = [c]
        else:
            self.components.append(c)
        return c

    def build(self):
        self.building = True

        self.sim = None

        # use the lock to make sure only one Simulator is building at a time
        self.viz.lock.acquire()
        for c in self.components:
            c.add_nengo_objects(self.viz)
        # build the simulation
        self.sim = nengo.Simulator(self.model)
        # remove the temporary components added for visualization
        for c in self.components:
            c.remove_nengo_objects(self.viz)
        # TODO: add checks to make sure everything's been removed
        self.viz.lock.release()

        self.building = False

    def runner(self):
        # run the simulation
        while not self.finished:
            if self.sim is None:
                time.sleep(0.01)
            else:
                self.sim.step()

            if self.rebuild:
                self.rebuild = False
                self.build()

    def finish(self):
        self.finished = True

    def create_javascript(self):

        return '\n'.join([c.javascript() for c in self.components])


class Viz(object):
    """The master visualization organizer set up for a particular model."""
    def __init__(self, filename, model=None, locals=None):
        if locals is None:
            locals = {}
            with open(filename) as f:
                code = f.read()
            exec(code, locals)

        if model is None:
            model = locals['model']
        locals['nengo_viz'] = nengo_viz

        self.model = model
        self.filename = filename
        self.locals = locals
        self.model_manager = ModelManager(model, locals)

        self.config = self.load_config()
        self.config_save_needed = False
        self.config_save_time = None   # time of last config file save
        self.config_save_period = 2.0  # minimum time between saves

        self.lock = threading.Lock()

    def get_uid(self, obj):
        return self.model_manager.get_uid(obj)
        
    def generate_uid(self, obj, prefix):
        self.model_manager.generate_uid(obj, prefix)

    def remove_uid(self, uid):
        self.model_manager.remove_uid(uid)

    def get_label(self, obj):
        return self.model_manager.get_label(obj)

    def find_templates(self):
        for k, v in self.locals.items():
            if isinstance(v, nengo_viz.components.component.Template):
                yield v

    def load_config(self):
        config = nengo_viz.config.Config()
        self.locals['_viz_config'] = config
        try:
            with open(self.filename + '.cfg') as f:
                config_code = f.readlines()
            for line in config_code:
                try:
                    exec(line, self.locals)
                except Exception as e:
                    print('error parsing config', line, e)
        except IOError:
            pass

        # make sure a SimControl and a NetGraph exist
        if '_viz_sim_control' not in self.locals:
            template = nengo_viz.components.SimControlTemplate()
            self.locals['_viz_sim_control'] = template
        if '_viz_net_graph' not in self.locals:
            template = nengo_viz.components.NetGraphTemplate()
            self.locals['_viz_net_graph'] = template

        if config[self.model].pos is None:
            config[self.model].pos = (0, 0)
        if config[self.model].size is None:
            config[self.model].size = (1.0, 1.0)

        for k, v in self.locals.items():
            if isinstance(v, nengo_viz.components.component.Template):
                self.model_manager.set_uid(v, k)
                # self.default_labels[v] = k
        return config

    def save_config(self, lazy=False, force=False):
        if not force and not self.config_save_needed:
            return

        now_time = time.time()
        if not force and lazy and self.config_save_time is not None:
            if (now_time - self.config_save_time) < self.config_save_period:
                return

        self.lock.acquire()
        self.config_save_time = now_time
        self.config_save_needed = False
        with open(self.filename + '.cfg', 'w') as f:
            # f.write(self.config.dumps(uids=self.default_labels))
            f.write(self.config.dumps(uids=self.model_manager._names))
        self.lock.release()

    def modified_config(self):
        if not self.config_save_needed:
            self.config_save_needed = True

    def start(self, port=8080, browser=True):
        """Start the web server"""
        nengo_viz.server.Server.viz = self
        nengo_viz.server.Server.start(port=port, browser=browser)

        print("names: %f" % self.model_manager.names_time)
        print("names2: %f" % self.model_manager.names2_time)
        print("parents: %f" % self.model_manager.parent_time)
        print("parent chains: %f" % self.model_manager.parent_chain_time)
        
        # print("Namefinder: %f" % self.name_finder.total_time)

    def create_sim(self):
        """Create a new Simulator with this configuration"""
        return VizSim(self)
