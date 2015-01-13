import time
import threading
import thread

import nengo

import nengo_viz.server
import nengo_viz.components

class VizSim(object):
    def __init__(self, viz):
        self.viz = viz
        self.model = viz.model
        self.dt = viz.dt
        self.building = True
        self.components = []
        self.finished = False

        self.viz.lock.acquire()
        for cls, args, kwargs in self.viz.template:
            c = cls(self, *args, **kwargs)
            self.viz.add(c)
            self.components.append(c)

        thread.start_new_thread(self.runner, ())

    def runner(self):
        self.sim = self.viz.Simulator(self.model, dt=self.dt)
        for c in self.components:
            c.remove_nengo_objects(self.viz)
        #TODO: add checks to make sure everything's been removed
        self.viz.lock.release()

        self.building = False

        while not self.finished:
            self.sim.run(10, progress_bar=False)

    def finish(self):
        self.finished = True

    def create_javascript(self):
        return '\n'.join([c.javascript() for c in self.components])



class Viz(object):
    def __init__(self, model, dt=0.001, Simulator=nengo.Simulator):
        self.model = model
        self.template = []
        self.template.append((nengo_viz.components.TimeControl, [], {}))
        self.dt = dt
        self.Simulator = Simulator
        self.lock = threading.Lock()
        self.components = {}

    def slider(self, *args, **kwargs):
        self.template.append((nengo_viz.components.Slider, args, kwargs))

    def value(self, *args, **kwargs):
        self.template.append((nengo_viz.components.Value, args, kwargs))

    def start(self, port=8080, browser=True):
        nengo_viz.server.Server.viz = self
        nengo_viz.server.Server.start(port=port, browser=browser)

    def create_sim(self):
        return VizSim(self)

    def add(self, component):
        self.components[id(component)] = component

    def get_component(self, id):
        c = self.components[id]
        del self.components[id]
        return c


