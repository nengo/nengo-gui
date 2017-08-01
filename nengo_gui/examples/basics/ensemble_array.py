# Nengo Network: Ensemble Array
#
# An ensemble array is a group of ensembles that each represent a part of the
# overall signal.
#
# Ensemble arrays are similar to normal ensembles, but expose a slightly
# different interface. Additionally, in an ensemble array, the components of
# the overall signal are not related. As a result, network arrays cannot be
# used to compute nonlinear functions that mix the dimensions they represent.

import nengo
import numpy as np

model = nengo.Network()
with model:
    # Make an input node
    sin = nengo.Node(lambda t: [np.cos(t), np.sin(t)])

    # Make ensembles to connect
    a = nengo.networks.EnsembleArray(n_neurons=100, n_ensembles=2)
    b = nengo.Ensemble(n_neurons=100, dimensions=2)
    c = nengo.networks.EnsembleArray(n_neurons=100, n_ensembles=2)

    # Connect the model elements, just feedforward
    nengo.Connection(sin, a.input)
    nengo.Connection(a.output, b)
    nengo.Connection(b, c.input)
