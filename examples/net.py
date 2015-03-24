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

    with nengo.Network(label='subnet') as subnet:
        a = nengo.Ensemble(100, 1)
        b = nengo.Ensemble(100, 1)
        nengo.Connection(result, a)
        nengo.Connection(a, b)
        nengo.Connection(b, b)

        with nengo.Network() as subsubnet:
            c = nengo.Ensemble(100, 1)
            d = nengo.Ensemble(100, 1)
            nengo.Connection(c, d)
        nengo.Connection(b, c)
        nengo.Connection(d, a)


import nengo_viz
viz = nengo_viz.Viz(model, locals=locals(), filename=__file__)
viz.value(result)
viz.start()
