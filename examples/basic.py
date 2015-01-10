import time

import numpy as np
import nengo

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

import nengo_viz
viz = nengo_viz.Viz(model)
viz.slider(stimulus_A)
viz.slider(stimulus_B)
viz.value(ens)
viz.value(result)
viz.start()




