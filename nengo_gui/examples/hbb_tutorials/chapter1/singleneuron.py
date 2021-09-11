# A Single Neuron Model

# All models in nengo are built inside "networks". Inside a network, you
# can put more networks, and you can connect networks to each other. You can
# also put other objects such as neural populations or "ensembles" (which
# have individual neurons inside of them) inside the networks. For this model,
# you will make a network with one neuron.

# This model has parameters as described in the book, ensuring that it is an
# "on" neuron. The neuron will be slightly different each time you run this
# script, as many parameters are randomly chosen.

# Press the play button to run the simulation.
# The graph on the top left shows the input signal and the graph on the top
# right shows the value represented by the neuron. The filtered spikes from the
# neuron are shown in the graph on the bottom right.


import nengo

# Setup the environment
import numpy as np

# Create the network object to which we can add ensembles, connections, etc.
model = nengo.Network(label="A Single Neuron")

with model:
    # Input
    stim = nengo.Node(lambda t: np.cos(16 * t), label="input")

    # Ensemble with one neuron
    neuron = nengo.Ensemble(
        1, dimensions=1, encoders=[[1]]  # Represent a scalar
    )  # Sets the neurons firing rate to increase for positive input

    # Connecting input to ensemble
    nengo.Connection(stim, neuron)
