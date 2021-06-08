# Communication Channel

# This example demonstrates how to create a connections from one neuronal
# ensemble to another that behaves like a communication channel (that is, it
# transmits information without changing it).

import nengo
import numpy as np

model = nengo.Network()
with model:
    # Create an abstract input signal that oscillates as sin(t)
    sin = nengo.Node(np.sin)

    # Create the neuronal ensembles
    a = nengo.Ensemble(n_neurons=100, dimensions=1)
    b = nengo.Ensemble(n_neurons=100, dimensions=1)

    # Connect the input to the first neuronal ensemble
    nengo.Connection(sin, a)

    # Connect the first neuronal ensemble to the second using a
    # neurotransmitter with a 10ms time constant
    # This is the communication channel.
    nengo.Connection(a, b, synapse=0.01)
