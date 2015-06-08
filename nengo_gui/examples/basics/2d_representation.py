# # Nengo Example: 2-Dimensional Representation
#
# Ensembles of neurons represent information. In Nengo, we represent that
# information with real-valued vectors -- lists of numbers. In this example,
# we will represent a two-dimensional vector with a single ensemble of leaky
# integrate-and-fire neurons.

import nengo
import numpy as np

model = nengo.Network()
with model:
    neurons = nengo.Ensemble(n_neurons=100, dimensions=2)

    stim = nengo.Node([0, 0])
    nengo.Connection(stim, neurons)
