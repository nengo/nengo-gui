import time

import nengo_viz.server
import nengo_viz.components


class Viz(object):
    def __init__(self, model):
        self.model = model
        self.components = {}

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
        nengo_viz.server.Server.viz = viz
        import thread
        thread.start_new_thread(self.runner, ())
        nengo_viz.server.Server.start(port=port, browser=browser)

    def runner(self):
        import time
        while True:
            self.sim.run(10, progress_bar=False)

    def create_javascript(self):
        return '\n'.join([c.javascript() for c in self.components.values()])


import nengo

def viz(model):
    server.Server.sim = nengo.Simulator(model)
    server.Server.start(port=8080, browser=True)

if __name__ == '__main__':
    import numpy as np
    model = nengo.Network()
    with model:
        stimulus_A = nengo.Node([1])
        stimulus_B = nengo.Node(lambda t: np.sin(2*np.pi*t))
        ens = nengo.Ensemble(n_neurons=100, dimensions=2)
        result = nengo.Ensemble(n_neurons=50, dimensions=1)
        nengo.Connection(stimulus_A, ens[0])
        nengo.Connection(stimulus_B, ens[1])
        nengo.Connection(ens, result, function=lambda x: x[0] * x[1],
                         synapse=0.01)

        import time
        class Timer(object):
            def __init__(self):
                self.ticks = 0
                self.start_time = time.time()
            def __call__(self, t):
                self.ticks += 1
                if self.ticks % 1000 == 0:
                    now = time.time()
                    dt = now - self.start_time
                    print 'rate: %g' % (1.0 / dt)
                    self.start_time = now
        nengo.Node(Timer())

    #sim = nengo.Simulator(model)
    #sim.run(100, progress_bar=False)


    viz = Viz(model)
    viz.slider(stimulus_A)
    viz.slider(stimulus_B)
    viz.value(ens)
    viz.value(result)
    viz.start()




