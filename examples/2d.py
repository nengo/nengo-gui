import numpy as np
import nengo

model = nengo.Network()
with model:
    stimulus = nengo.Node(lambda t: (np.sin(t), np.cos(t)))
    ens = nengo.Ensemble(n_neurons=1000, dimensions=2)
    nengo.Connection(stimulus, ens)

import nengo_viz
viz = nengo_viz.Viz(model, locals=locals(), filename=__file__)
viz.slider(stimulus)
viz.value(ens)
viz.start()
