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


class VizException(Exception):
    pass


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
        webpage_title_js = ';document.title = %s;' % fn

        ##Ensure that sim control is first
        temp = self.components[0]
        counter = 0
        for t in self.components:
            if isinstance(t, nengo_viz.components.SimControl):
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

class AceEditor(Template):
    def __init__(self, target):
        super(AceEditor, self).__init__(nengo_viz.components.AceEditor, target)
        self.target = target

    def code_python(self, uids):
        return 'nengo_viz.AceEditor(%s)' % uids[self.target]

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

class XYValue(Template):
    def __init__(self, target):
        super(XYValue, self).__init__(nengo_viz.components.XYValue, target)
        self.target = target

    def code_python(self, uids):
        return 'nengo_viz.XYValue(%s)' % uids[self.target]

class Raster(Template):
    def __init__(self, target):
        super(Raster, self).__init__(nengo_viz.components.Raster, target)
        self.target = target

    def code_python(self, uids):
        return 'nengo_viz.Raster(%s)' % uids[self.target]

class Pointer(Template):
    def __init__(self, target):
        super(Pointer, self).__init__(nengo_viz.components.Pointer, target)
        self.target = target

    def code_python(self, uids):
        return 'nengo_viz.Pointer(%s)' % uids[self.target]

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
        for cls in [XYValue, Value, Slider, Raster, Pointer]:
            self.configures(cls)
            self[cls].set_param('x', nengo.params.Parameter(0))
            self[cls].set_param('y', nengo.params.Parameter(0))
            self[cls].set_param('width', nengo.params.Parameter(100))
            self[cls].set_param('height', nengo.params.Parameter(100))
            self[cls].set_param('label_visible', nengo.params.Parameter(True))
        self[Value].set_param('maxy', nengo.params.Parameter(1))
        self[Value].set_param('miny', nengo.params.Parameter(-1))
        self[XYValue].set_param('max_value', nengo.params.Parameter(1))
        self[XYValue].set_param('min_value', nengo.params.Parameter(-1))
        self[XYValue].set_param('index_x', nengo.params.Parameter(0))
        self[XYValue].set_param('index_y', nengo.params.Parameter(1))
        self[Slider].set_param('min_value', nengo.params.Parameter(-1))
        self[Slider].set_param('max_value', nengo.params.Parameter(1))
        self[Pointer].set_param('show_pairs', nengo.params.Parameter(False))



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
                if isinstance(obj, XYValue):
                    lines.append('_viz_config[%s].min_value = %g' % (uid, self[obj].min_value))
                    lines.append('_viz_config[%s].max_value = %g' % (uid, self[obj].max_value))
                    lines.append('_viz_config[%s].index_x = %g' % (uid, self[obj].index_x))
                    lines.append('_viz_config[%s].index_y = %g' % (uid, self[obj].index_y))
                if isinstance(obj, Pointer):
                    lines.append('_viz_config[%s].show_pairs = %g' % (uid, self[obj].show_pairs))


        return '\n'.join(lines)

class Viz(object):
    """The master visualization organizer set up for a particular model."""
    def __init__(
            self, filename=None, model=None, locals=None, cfg=None,
            interactive=True, allow_file_change=True):
        if nengo_viz.monkey.is_executing():
            raise nengo_viz.monkey.StartedVizException()

        self.allow_file_change = allow_file_change

        self.viz_sims = []
        self.cfg = cfg
        self.interactive = interactive;

        self.config_save_period = 2.0  # minimum time between saves

        if filename is None:
            filename = os.path.join(nengo_viz.__path__[0],
                                    'examples',
                                    'default.py')

        self.load(filename, model, locals)

    def load(self, filename, model=None, locals=None):
        try:
            filename = os.path.relpath(filename)
        except ValueError:
            pass

        if locals is None:
            locals = {}
            locals['nengo_viz'] = nengo_viz
            locals['__file__'] = filename

            with open(filename) as f:
                self.code = f.read()

            with nengo_viz.monkey.patch():
                try:
                    exec(self.code, locals)
                except nengo_viz.monkey.StartedSimulatorException:
                    if self.interactive:
                        line = nengo_viz.monkey.determine_line_number()
                        print('nengo.Simulator() started on line %d. '
                              'Ignoring all subsequent lines.' % line)
                except nengo_viz.monkey.StartedVizException:
                    if self.interactive:
                        line = nengo_viz.monkey.determine_line_number()
                        print('nengo_viz.Viz() started on line %d. '
                              'Ignoring all subsequent lines.' % line)
        self.orig_locals = dict(locals)

        if model is None:
            if 'model' not in locals:
                raise VizException('No object called "model" in the code')
            model = locals['model']
            if not isinstance(model, nengo.Network):
                raise VizException('The "model" must be a nengo.Network')



        self.model = model
        self.locals = dict(locals)

        self.filename = filename
        self.name_finder = nengo_viz.NameFinder(locals, model)
        self.default_labels = self.name_finder.known_name

        self.config = self.load_config()
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
        if self.cfg is None:
            return self.filename + '.cfg'
        else:
            return self.cfg

    def load_config(self):
        config = nengo_viz.config.Config()
        self.locals['nengo_viz'] = nengo_viz
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

    def start(self, port=8080, browser=True, password=None):
        """Start the web server"""
        print("Starting nengo_viz server at http://localhost:%d" % port)
        if password is not None:
            nengo_viz.server.Server.add_user('', password)
            addr = ''
        else:
            addr = 'localhost'
        nengo_viz.server.Server.start(self, port=port, browser=browser, addr=addr)

    def prepare_server(self, viz, port=8080, browser=True):
        return nengo_viz.server.Server.prepare_server(
            self, port=port, browser=browser)

    def begin_lifecycle(self, server):
        nengo_viz.server.Server.begin_lifecycle(
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
