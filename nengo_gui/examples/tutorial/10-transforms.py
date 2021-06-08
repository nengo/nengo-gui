# Tutorial 10: Transforms and scaling

# When making Connections, we may want to scale the values being represented.
# For example, we might want to just multiply a value by a fixed number like
# 0.1 or 10 or something like that.  Since this value doesn't change, we do
# not need a full multiplication system like in the previous tutorial.

# We could implement this sort of connection by writing a function.  However,
# this is such a common thing to do that Nengo has a shortcut for this by
# having a "transform" parameter.  The examples below show the equivalence of
# these two approaches.  In particular, b1 and b2 both take the value from a
# and multiply it by -0.5.  For a multidimensional example, d1 and d2 both take
# values from c and compute 2*c[0]-c[1]-c[2], but do so in different ways.  In
# both cases the resulting models are identical.

# You can use this trick to quickly define any linear transformation on the
# values represented by the Ensembles.

import nengo

model = nengo.Network()
with model:
    stim_a = nengo.Node(0)
    a = nengo.Ensemble(n_neurons=50, dimensions=1)
    nengo.Connection(stim_a, a)

    b1 = nengo.Ensemble(n_neurons=50, dimensions=1)
    b2 = nengo.Ensemble(n_neurons=50, dimensions=1)

    # the long way to do it
    def simple_function(a):
        return -0.5 * a

    nengo.Connection(a, b1, function=simple_function)
    # the shortcut way to do it
    nengo.Connection(a, b2, transform=-0.5)

    stim_c = nengo.Node([0, 0, 0])
    c = nengo.Ensemble(n_neurons=200, dimensions=3)
    nengo.Connection(stim_c, c)

    d1 = nengo.Ensemble(n_neurons=50, dimensions=1)
    d2 = nengo.Ensemble(n_neurons=50, dimensions=1)

    # the long way to do it
    def harder_function(c):
        return 2 * c[0] - c[1] - c[2]

    nengo.Connection(c, d1, function=harder_function)
    # the shortcut way to do it
    nengo.Connection(c, d2, transform=[[2, -1, -1]])
