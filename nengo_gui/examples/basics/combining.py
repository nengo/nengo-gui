# Nengo Example: Combining
#
# This example demonstrates how to create a neuronal ensemble that will
# combine two 1-D inputs into one 2-D representation.

import nengo
import numpy as np

model = nengo.Network()
with model:
    # Our input ensembles consist of 100 leaky integrate-and-fire neurons,
    # representing a one-dimensional signal
    a = nengo.Ensemble(n_neurons=100, dimensions=1)
    b = nengo.Ensemble(n_neurons=100, dimensions=1)

    # The output ensemble consists of 200 leaky integrate-and-fire neurons,
    # representing a two-dimensional signal
    output = nengo.Ensemble(200, dimensions=2)

    # Create input nodes generating the sine and cosine
    sin = nengo.Node(output=np.sin)
    cos = nengo.Node(output=np.cos)

    nengo.Connection(sin, a)
    nengo.Connection(cos, b)

    # The square brackets define which dimension the input will project to
    nengo.Connection(a, output[1])
    nengo.Connection(b, output[0])
