import time
import threading
import thread

import nengo

import nengo_viz.server
import nengo_viz.components
import nengo_viz


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

        # use the lock to make sure only one Simulator is building at a time
        self.viz.lock.acquire()

        for template in self.viz.find_templates():
            c = template.create(self)
            self.uids[c.uid] = c
            self.components.append(c)

        # build and run the model in a separate thread
        thread.start_new_thread(self.runner, ())

    def runner(self):
        # build the simulation
        self.sim = nengo.Simulator(self.model)
        # remove the temporary components added for visualization
        for c in self.components:
            c.remove_nengo_objects(self.viz)
        # TODO: add checks to make sure everything's been removed
        self.viz.lock.release()

        self.building = False

        # run the simulation
        while not self.finished:
            self.sim.run(0.1, progress_bar=False)

    def finish(self):
        self.finished = True

    def create_javascript(self):

        return '\n'.join([c.javascript() for c in self.components])


class Template(object):
    def __init__(self, cls, *args, **kwargs):
        self.cls = cls
        self.args = args
        self.kwargs = kwargs
    def create(self, vizsim):
        uid = vizsim.viz.get_uid(self)
        c = self.cls(vizsim, vizsim.viz.config[self], uid,
                     *self.args, **self.kwargs)
        c.template = self
        return c

class Slider(Template):
    def __init__(self, target):
        super(Slider, self).__init__(nengo_viz.components.Slider, target)
        self.target = target

    def code_python(self, uids):
        return 'nengo_viz.Slider(%s)' % uids[self.target]

class Value(Template):
    def __init__(self, target):
        super(Value, self).__init__(nengo_viz.components.Value, target)
        self.target = target

    def code_python(self, uids):
        return 'nengo_viz.Value(%s)' % uids[self.target]

class NetGraph(Template):
    def __init__(self):
        super(NetGraph, self).__init__(nengo_viz.components.NetGraph)
    def code_python(self, uids):
        return 'nengo_viz.NetGraph()'

class SimControl(Template):
    def __init__(self):
        super(SimControl, self).__init__(nengo_viz.components.SimControl)
    def code_python(self, uids):
        return 'nengo_viz.SimControl()'

class Config(nengo.Config):
    def __init__(self):
        super(Config, self).__init__()
        for cls in [nengo.Ensemble, nengo.Node]:
            self.configures(cls)
            self[cls].set_param('pos', nengo.params.Parameter(None))
            self[cls].set_param('size', nengo.params.Parameter(None))
        self.configures(nengo.Network)
        self[nengo.Network].set_param('pos', nengo.params.Parameter(None))
        self[nengo.Network].set_param('size', nengo.params.Parameter(None))
        self[nengo.Network].set_param('expanded', nengo.params.Parameter(False))
        self[nengo.Network].set_param('has_layout', nengo.params.Parameter(False))

        self.configures(NetGraph)
        self.configures(SimControl)
        self[SimControl].set_param('shown_time', nengo.params.Parameter(0.5))
        self[SimControl].set_param('kept_time', nengo.params.Parameter(4.0))
        self.configures(Value)
        self.configures(Slider)
        for cls in [Value, Slider]:
            self[cls].set_param('x', nengo.params.Parameter(0))
            self[cls].set_param('y', nengo.params.Parameter(0))
            self[cls].set_param('width', nengo.params.Parameter(100))
            self[cls].set_param('height', nengo.params.Parameter(100))
            self[cls].set_param('label_visible', nengo.params.Parameter(True))
        self[Value].set_param('maxy', nengo.params.Parameter(1))
        self[Value].set_param('miny', nengo.params.Parameter(-1))
        self[Slider].set_param('min_value', nengo.params.Parameter(-1))
        self[Slider].set_param('max_value', nengo.params.Parameter(1))



    def dumps(self, uids):
        lines = []
        for obj, uid in sorted(uids.items(), key=lambda x: x[1]):
            if isinstance(obj, nengo.Ensemble):
                lines.append('_viz_config[%s].pos=%s' % (uid, self[obj].pos))
                lines.append('_viz_config[%s].size=%s' % (uid, self[obj].size))
            elif isinstance(obj, nengo.Node):
                lines.append('_viz_config[%s].pos=%s' % (uid, self[obj].pos))
                lines.append('_viz_config[%s].size=%s' % (uid, self[obj].size))
            elif isinstance(obj, nengo.Network):
                lines.append('_viz_config[%s].pos=%s' % (uid, self[obj].pos))
                lines.append('_viz_config[%s].size=%s' % (uid, self[obj].size))
                lines.append('_viz_config[%s].expanded=%s' % (uid, self[obj].expanded))
                lines.append('_viz_config[%s].has_layout=%s' % (uid, self[obj].has_layout))
            elif isinstance(obj, Template):
                lines.append('%s = %s' % (uid, obj.code_python(uids)))
                if not isinstance(obj, (NetGraph, SimControl)):
                    lines.append('_viz_config[%s].x = %g' % (uid, self[obj].x))
                    lines.append('_viz_config[%s].y = %g' % (uid, self[obj].y))
                    lines.append('_viz_config[%s].width = %g' % (uid, self[obj].width))
                    lines.append('_viz_config[%s].height = %g' % (uid, self[obj].height))
                    lines.append('_viz_config[%s].label_visible = %s' % (uid, self[obj].label_visible))
                if isinstance(obj, Slider):
                    lines.append('_viz_config[%s].min_value = %g' % (uid, self[obj].min_value))
                    lines.append('_viz_config[%s].max_value = %g' % (uid, self[obj].max_value))
                if isinstance(obj, Value):
                    lines.append('_viz_config[%s].miny = %g' % (uid, self[obj].miny))
                    lines.append('_viz_config[%s].maxy = %g' % (uid, self[obj].maxy))


        return '\n'.join(lines)


class Viz(object):
    """The master visualization organizer set up for a particular model."""
    def __init__(self, filename, model=None, locals=None):
        if locals is None:
            locals = {}
            with open(filename) as f:
                code = f.read()
            exec code in locals

        if model is None:
            model = locals['model']
        locals['nengo_viz'] = nengo_viz

        self.model = model
        self.filename = filename
        self.locals = locals
        self.name_finder = nengo_viz.NameFinder(locals, model)
        self.default_labels = self.name_finder.known_name

        self.config = self.load_config()

        self.lock = threading.Lock()

        self.uid_prefix_counter = {}

    def find_templates(self):
        for k, v in self.locals.items():
            if isinstance(v, Template):
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

    def load_config(self):
        config = Config()
        self.locals['_viz_config'] = config
        try:
            with open(self.filename + '.cfg') as f:
                config_code = f.readlines()
            for line in config_code:
                try:
                    exec line in self.locals
                except Exception as e:
                    print('error parsing config', line, e)
        except IOError:
            pass

        if '_viz_sim_control' not in self.locals:
            self.locals['_viz_sim_control'] = SimControl()
        if '_viz_net_graph' not in self.locals:
            self.locals['_viz_net_graph'] = NetGraph()
        if config[self.model].pos is None:
            config[self.model].pos = (0, 0)
        if config[self.model].size is None:
            config[self.model].size = (1.0, 1.0)

        for k, v in self.locals.items():
            if isinstance(v, Template):
                self.default_labels[v] = k
        return config

    def save_config(self):
        with open(self.filename + '.cfg', 'w') as f:
            f.write(self.config.dumps(uids=self.default_labels))

    def get_label(self, obj):
        label = obj.label
        if label is None:
            label = self.default_labels.get(obj, None)
        if label is None:
            label = `obj`
        return label

    def get_uid(self, obj):
        uid = self.default_labels.get(obj, None)
        if uid is None:
            uid = `obj`
        return uid

    def start(self, port=8080, browser=True):
        """Start the web server"""
        nengo_viz.server.Server.viz = self
        nengo_viz.server.Server.start(port=port, browser=browser)

    def create_sim(self):
        """Create a new Simulator with this configuration"""
        return VizSim(self)
