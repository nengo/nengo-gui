import nengo

model = nengo.Network()
with model:
    stim = nengo.Node([0])
    a = nengo.Ensemble(n_neurons=50, dimensions=1)
    nengo.Connection(stim, a)
