import time
import threading
import inspect

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
        if isinstance(template, (SimControlTemplate, NetGraphTemplate)):
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


class Template(object):
    config_params = dict(x=0, y=0, width=100, height=100, label_visible=True)

    def __init__(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs
    def create(self, vizsim):
        uid = vizsim.viz.get_uid(self)
        c = self.cls(vizsim, vizsim.viz.config[self], uid,
                     *self.args, **self.kwargs)
        c.template = self
        return c
    def code_python(self, uids):
        args = [uids[x] for x in self.args]
        name = self.__class__.__name__
        return 'nengo_viz.%s(%s)' % (name, ','.join(args))

class SliderTemplate(Template):
    cls = nengo_viz.components.Slider
    config_params = dict(max_value=1, min_value=-1, **Template.config_params)

class ValueTemplate(Template):
    cls = nengo_viz.components.Value
    config_params = dict(maxy=1, miny=-1, **Template.config_params)

class XYValueTemplate(Template):
    cls = nengo_viz.components.XYValue
    config_params = dict(max_value=1, min_value=-1, index_x=0, index_y=1,
                         **Template.config_params)

class RasterTemplate(Template):
    cls = nengo_viz.components.Raster

class PointerTemplate(Template):
    cls = nengo_viz.components.Pointer
    config_params = dict(show_pairs=False, **Template.config_params)


class NetGraphTemplate(Template):
    cls = nengo_viz.components.NetGraph
    config_params = dict()


class SimControlTemplate(Template):
    cls = nengo_viz.components.SimControl
    config_params = dict(shown_time=0.5, kept_time=4.0)


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

        for clsname, cls in inspect.getmembers(nengo_viz.viz):
            if inspect.isclass(cls) and issubclass(cls, Template):
                self.configures(cls)
                for k, v in cls.config_params.items():
                    self[cls].set_param(k, nengo.params.Parameter(v))


    def dumps(self, uids):
        lines = []
        for obj, uid in sorted(uids.items(), key=lambda x: x[1]):
            if isinstance(obj, (nengo.Ensemble, nengo.Node, nengo.Network)):
                if self[obj].pos is not None:
                    lines.append('_viz_config[%s].pos=%s' % (uid, self[obj].pos))
                if self[obj].size is not None:
                    lines.append('_viz_config[%s].size=%s' % (uid, self[obj].size))
                if isinstance(obj, nengo.Network):
                    lines.append('_viz_config[%s].expanded=%s' % (uid, self[obj].expanded))
                    lines.append('_viz_config[%s].has_layout=%s' % (uid, self[obj].has_layout))
            elif isinstance(obj, Template):
                lines.append('%s = %s' % (uid, obj.code_python(uids)))
                for k in obj.config_params.keys():
                    v = getattr(self[obj], k)
                    lines.append('_viz_config[%s].%s = %g' % (uid, k, v))


        return '\n'.join(lines)


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

    def remove_uid(self, uid):
        obj = self.locals[uid]
        del self.locals[uid]
        del self.default_labels[obj]

    def load_config(self):
        config = Config()
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

        if '_viz_sim_control' not in self.locals:
            self.locals['_viz_sim_control'] = SimControlTemplate()
        if '_viz_net_graph' not in self.locals:
            self.locals['_viz_net_graph'] = NetGraphTemplate()
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
            label = repr(obj)
        return label

    def get_uid(self, obj):
        uid = self.default_labels.get(obj, None)
        if uid is None:
            uid = repr(obj)
        return uid

    def start(self, port=8080, browser=True):
        """Start the web server"""
        nengo_viz.server.Server.viz = self
        nengo_viz.server.Server.start(port=port, browser=browser)

    def create_sim(self):
        """Create a new Simulator with this configuration"""
        return VizSim(self)
