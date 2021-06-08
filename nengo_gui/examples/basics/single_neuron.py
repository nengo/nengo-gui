# Nengo Example: A Single Neuron
#
# This demo shows you how to construct and manipulate a single leaky
# integrate-and-fire (LIF) neuron. The LIF neuron is a simple, standard
# neuron model, and here it resides inside a neural population, even though
# there is only one neuron.

import nengo

model = nengo.Network()
with model:
    neuron = nengo.Ensemble(n_neurons=1, dimensions=1)
    # Set intercept to 0.5
    neuron.intercepts = nengo.dists.Uniform(-0.5, -0.5)
    # Set the maximum firing rate of the neuron to 100hz
    neuron.max_rates = nengo.dists.Uniform(100, 100)
    # Sets the neurons firing rate to increase for positive input
    neuron.encoders = [[1]]

    stim = nengo.Node(0)

    # Connect the input signal to the neuron
    nengo.Connection(stim, neuron)
