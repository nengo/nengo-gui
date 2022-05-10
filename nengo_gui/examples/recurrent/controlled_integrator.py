# Nengo Example: Controlled Integrator
#
# A controlled integrator is a circuit that acts on two signals:
#
# 1. Input - the signal being integrated
# 2. Control - the control signal to the integrator
#
# A controlled integrator accumulates input, but its state can be directly
# manipulated by the control signal.
#
# We can use standard network-creation commands to begin creating our
# controlled integrator. We create a Network, and then we create a population
# of neurons (called an *ensemble*). This population of neurons will
# represent the state of our integrator, and the connections between
# the neurons in the ensemble will define the dynamics of our integrator.

import nengo

model = nengo.Network()
with model:
    # Make a population with 200 LIF neurons representing a 2 dimensional
    # signal, with a larger radius to accommodate large inputs
    a = nengo.Ensemble(n_neurons=200, dimensions=2, radius=1.5)

    # Define an input signal within our model
    stim = nengo.Node(0)

    # Connect the Input signal to ensemble a, affecting only the
    # first dimension. The `transform` argument scales the effective
    # strength of the connection by tau.
    tau = 0.1
    nengo.Connection(stim, a[0], transform=tau, synapse=tau)

    control = nengo.Node(0)

    # Connect the "Control" signal to the second of a's two input channels.
    nengo.Connection(control, a[1], synapse=0.005)

    # Create a recurrent connection that first takes the product
    # of both dimensions in A (i.e., the value times the control)
    # and then adds this back into the first dimension of A using
    # a transform
    nengo.Connection(a, a[0], function=lambda x: x[0] * x[1] + x[0], synapse=tau)
