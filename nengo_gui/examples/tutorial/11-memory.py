# Tutorial 11: Memory

# Nengo models can also store information over time.  To do this, we simply
# make a Connection from an Ensemble back to itself.  That is, we form a
# Connection that will feed a value into an Ensemble that is the same value
# that the Ensemble is currently representing.  This means we can store data
# over time.

# To use such a system, connect into it with another Ensemble.  If that input
# is zero, then the stored value should stay the same as it currently is.
# If the input is positive, the stored value should increase.  If the input is
# negative, it should decrease.

# Notice that the input Connection has "transform=0.1".  That is to control
# how strongly the input affects the stored value.  If you make the transform
# larger, it will change more quickly.

# Also notice that the recurrent Connection from b back to itself has
# synapse=0.1.  This longer time constant makes the memory more stable, and
# is also commonly found in the real brain for recurrent connections.

# Mathematical Note: In the case where the input transform is exactly equal to
# the recurrent synapse (as it is here), it turns out that the resulting system
# should compute the mathematical integral of the input.

import nengo

model = nengo.Network()
with model:
    stim_a = nengo.Node(0)
    a = nengo.Ensemble(n_neurons=50, dimensions=1)
    nengo.Connection(stim_a, a)

    b = nengo.Ensemble(n_neurons=50, dimensions=1)
    nengo.Connection(b, b, synapse=0.1)
    nengo.Connection(a, b, transform=0.1)
