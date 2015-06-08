# Nengo Example: Inhibitory Gating of Ensembles

# ## Step 1: Create the network
#
# Our model consists of two ensembles (called A and B) that receive inputs from
# a common sine wave signal generator.
#
# Ensemble A is gated using the output of a node, while Ensemble B is gated
# using the output of a third ensemble (C). This is to demonstrate that
# ensembles can be gated using either node outputs, or decoded outputs from
# ensembles.

import nengo

model = nengo.Network()
with model:
    a = nengo.Ensemble(n_neurons=30, dimensions=1)
    b = nengo.Ensemble(n_neurons=30, dimensions=1)
    c = nengo.Ensemble(n_neurons=30, dimensions=1)

    stim = nengo.Node(0)
    inhibition = nengo.Node(0)

    nengo.Connection(stim, a)
    nengo.Connection(stim, b)
    nengo.Connection(inhibition, a.neurons, transform=[[-2.5]] * 30)
    nengo.Connection(inhibition, c)
    nengo.Connection(c, b.neurons, transform=[[-2.5]] * 30)
