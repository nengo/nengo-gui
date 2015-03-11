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
        self.model = viz.model
        self.dt = viz.dt
        self.building = True    # are we still building the model?
        self.components = []
        self.finished = False   # are we done simulating?

        # use the lock to make sure only one Simulator is building at a time
        self.viz.lock.acquire()
        
        #Tile the components
        self.viz.tile_components()

        # add components to the model for visualization purposes
        for cls, args, kwargs in self.viz.template:
            c = cls(self, *args, **kwargs)
            self.viz.add(c)
            self.components.append(c)

        # build and run the model in a separate thread
        thread.start_new_thread(self.runner, ())

    def runner(self):
        # build the simulation
        self.sim = self.viz.Simulator(self.model, dt=self.dt)
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


class Viz(object):
    """The master visualization organizer set up for a particular model."""
    def __init__(self, model, dt=0.001, Simulator=nengo.Simulator,
                              shown_time=0.5, kept_time=4.0,
                              locals=None, default_labels=None):
        self.model = model
        self.template = []    # what components to show
        self.template.append((nengo_viz.components.SimControl, [],
                              dict(shown_time=shown_time, kept_time=kept_time)))
        self.dt = dt
        self.Simulator = Simulator  # what simulator to use
        self.lock = threading.Lock()

        if default_labels is None:
            if locals is not None:
                nf = nengo_viz.NameFinder(locals, model)
                default_labels = nf.known_name
            else:
                default_labels = {}
        self.default_labels = default_labels

        # list for maintaining components that are waiting for a websocket
        # connection to start
        self.components = {}

    def get_label(self, obj):
        label = obj.label
        if label is None:
            label = self.default_labels.get(obj, None)
        if label is None:
            label = self.default_labels.get(id(obj), None)
        if label is None:
            label = `obj`
        return label

    def slider(self, *args, **kwargs):
        """Add a slider (for controlling a Node's value)"""
        self.template.append((nengo_viz.components.Slider, args, kwargs))

    def value(self, *args, **kwargs):
        """Add a value graph (showing decoded data)"""
        self.template.append((nengo_viz.components.Value, args, kwargs))

    def raster(self, *args, **kwargs):
        """Add a value graph (showing decoded data)"""
        self.template.append((nengo_viz.components.Raster, args, kwargs))

    def pointer(self, *args, **kwargs):
        """Add a semantic pointer graph"""
        self.template.append((nengo_viz.components.Pointer, args, kwargs))

    def start(self, port=8080, browser=True):
        """Start the web server"""
        nengo_viz.server.Server.viz = self
        nengo_viz.server.Server.start(port=port, browser=browser)

    def create_sim(self):
        """Create a new Simulator with this configuration"""
        return VizSim(self)

    def add(self, component):
        """Add a component to the list of known components"""
        self.components[id(component)] = component

    def tile_components(self, width=1000, row_height=150, col_width=200):
        count = len(self.template)

        x = 0
        y = 20

        for index, (c, args, kwargs) in enumerate(self.template):
            if c is nengo_viz.components.SimControl:
                continue
            kwargs['x'] = x
            kwargs['y'] = y
            kwargs['width'] = col_width
            kwargs['height'] = row_height
            x += col_width
            if x + col_width > width:
                x = 0
                y += row_height
            self.template[index] = (c, args, kwargs)



    def pop_component(self, id):
        """Find a registered component by its id.

        Each component registers itself, and when the WebSocket connection
        for that component is made, this is called to figure out what
        component is needed.  Note that a component can only ever get one
        connection to it, so we remove it from the dictionary after the
        connection is made.
        """
        c = self.components[id]
        del self.components[id]
        return c
