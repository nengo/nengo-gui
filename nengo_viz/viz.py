import time

import nengo

import nengo_viz.server
import nengo_viz.components


class Viz(object):
    def __init__(self, model):
        self.model = model
        self.components = {}
        self.time_control = nengo_viz.components.TimeControl(self)

    def add(self, component):
        self.components[id(component)] = component

    def get_component(self, id):
        return self.components[id]

    def slider(self, *args, **kwargs):
        return nengo_viz.components.Slider(self, *args, **kwargs)

    def value(self, *args, **kwargs):
        return nengo_viz.components.Value(self, *args, **kwargs)

    def start(self, port=8080, browser=True):
        self.sim = nengo.Simulator(self.model)
        nengo_viz.server.Server.viz = self
        import thread
        thread.start_new_thread(self.runner, ())
        nengo_viz.server.Server.start(port=port, browser=browser)

    def runner(self):
        import time
        while True:
            self.sim.run(10, progress_bar=False)

    def create_javascript(self):
        return '\n'.join([c.javascript() for c in self.components.values()])
