# Nengo Example: A Simple Harmonic Oscillator
#
# This demo implements a simple harmonic oscillator in a 2D neural
# population.  The oscillator is more visually interesting on its own than
# the integrator, but the principle at work is the same. Here, instead of
# having the recurrent input just integrate (i.e. feeding the full input
# value back to the population), we have two dimensions which interact.

import nengo

model = nengo.Network()
with model:
    # Create the ensemble for the oscillator
    neurons = nengo.Ensemble(n_neurons=200, dimensions=2)

    # Create an input signal that gives a brief input pulse to start the
    # oscillator
    stim = nengo.Node(lambda t: 1 if t < 0.1 else 0)
    # Connect the input signal to the neural ensemble
    nengo.Connection(stim, neurons[0])

    # Create the feedback connection
    nengo.Connection(neurons, neurons, transform=[[1, 1], [-1, 1]], synapse=0.1)
