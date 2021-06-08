# Nengo Example: Two Neurons
#
# This demo shows how to construct and manipulate a complementary pair of
# neurons.
#
# These are leaky integrate-and-fire (LIF) neurons. The neuron tuning
# properties have been selected so there is one on and one off neuron.
#
# One neuron will increase for positive input, and the other will decrease.
# This can be thought of as the simplest population that is able to give a
# reasonable representation of a scalar value.

import nengo
import numpy as np

model = nengo.Network()
with model:
    neurons = nengo.Ensemble(n_neurons=2, dimensions=1)
    # Set the intercepts at .5
    neurons.intercepts = nengo.dists.Uniform(-0.5, -0.5)
    # Set the max firing rate at 100hz
    neurons.max_rates = nengo.dists.Uniform(100, 100)
    # One 'on' and one 'off' neuron
    neurons.encoders = [[1], [-1]]

    # make a
    stim = nengo.Node([0])

    nengo.Connection(stim, neurons, synapse=0.01)
