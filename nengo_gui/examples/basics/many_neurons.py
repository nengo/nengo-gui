# Nengo Example: Many neurons
#
# This demo shows how to construct and manipulate a population of neurons.
#
# These are 100 leaky integrate-and-fire (LIF) neurons. The neuron tuning
# properties have been randomly selected.
#
# The input is a sine wave to show the effects of increasing or decreasing
# input. As a population, these neurons do a good job of representing a
# single scalar value.

import nengo

model = nengo.Network()
with model:
    # Our ensemble consists of 100 leaky integrate-and-fire neurons,
    # representing a one-dimensional signal
    a = nengo.Ensemble(n_neurons=100, dimensions=1)

    stim = nengo.Node([0])

    # Connect the input to the population
    nengo.Connection(stim, a)
