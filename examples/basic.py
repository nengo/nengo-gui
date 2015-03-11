import numpy as np
import nengo

model = nengo.Network()
with model:
    stimulus_A = nengo.Node([1], label='stim A')
    stimulus_B = nengo.Node(lambda t: np.sin(2*np.pi*t))
    ens = nengo.Ensemble(n_neurons=1000, dimensions=2)
    result = nengo.Ensemble(n_neurons=50, dimensions=1)
    nengo.Connection(stimulus_A, ens[0])
    nengo.Connection(stimulus_B, ens[1])
    nengo.Connection(ens, result, function=lambda x: x[0] * x[1],
                     synapse=0.01)

#sim = nengo.Simulator(model)
#sim.run(100, progress_bar=False)

import nengo_viz
viz = nengo_viz.Viz(model, locals=locals())
viz.slider(stimulus_A)
viz.slider(stimulus_B)
viz.value(ens)
viz.value(result)
viz.raster(result.neurons, n_neurons=10)
viz.start()
