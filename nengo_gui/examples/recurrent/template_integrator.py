# # Nengo Example: Integrator
#
# This demo implements a one-dimensional neural integrator.
#
# This is the first example of a recurrent network in the demos. It shows how
# neurons can be used to implement stable dynamics. Such dynamics are important
# for memory, noise cleanup, statistical inference, and many other dynamic
# transformations.
#
# Note that since the integrator constantly sums its input, it will saturate
# quickly if you leave the input non-zero. This makes it  clear that neurons
# have a finite range of representation. Such saturation effects can be
# exploited to perform useful computations (e.g. soft normalization).

import nengo

tau = 0.1

model = nengo.Network()

with model:
    integrator = nengo.networks.Integrator(tau, n_neurons=100, dimensions=1)
    stim = nengo.Node(0)

    nengo.Connection(stim, integrator.input, synapse=tau)
