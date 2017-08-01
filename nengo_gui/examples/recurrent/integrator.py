# Nengo Example: Integrator
#
# This demo implements a one-dimensional neural integrator.
#
# This is the first example of a recurrent network in the demos. It shows how
# neurons can be used to implement stable dynamics. Such dynamics are
# important for memory, noise cleanup, statistical inference, and many
# other dynamic transformations.
#
# Note that since the integrator constantly sums its input, it will
# saturate quickly if you leave the input non-zero. This makes it clear
# that neurons have a finite range of representation. Such saturation
# effects can be exploited to perform useful computations
# (e.g. soft normalization).

import nengo

model = nengo.Network()
with model:
    # Our ensemble consists of 100 leaky integrate-and-fire neurons,
    # representing a one-dimensional signal
    a = nengo.Ensemble(n_neurons=100, dimensions=1)

    # Create a piecewise step function for input
    stim = nengo.Node([0])

    # Connect the population to itself using a long time constant (tau)
    # for stability
    tau = 0.1
    nengo.Connection(a, a, synapse=tau)

    # Connect the input using the same time constant as on the recurrent
    # connection to make it more ideal
    nengo.Connection(stim, a, transform=tau, synapse=tau)
