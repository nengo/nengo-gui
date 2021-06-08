# Tutorial 18: Networks

# To help organize larger models, you can make Networks inside of the main
# model Network.
#
# In the graphic interface, the items inside these Networks are not shown
# by default.  If you double-click on a Network you can show (or hide) its
# internals.

# Nengo also comes with a collection of pre-made Networks that can help
# simplify the creation of large models.  For example, the code below uses a
# nengo.networks.EnsembleArray, which is a shortcut for creating a set of
# identical Ensembles.  It also provides a convenient "input" and "output"
# components that let you easily connect to or from all of the Ensembles at
# once.


import nengo

model = nengo.Network()
with model:
    stim_a = nengo.Node([0, 0, 0])
    stim_b = nengo.Node([0, 0])

    part1 = nengo.Network()
    with part1:
        a = nengo.Ensemble(n_neurons=100, dimensions=3)
        b = nengo.Ensemble(n_neurons=100, dimensions=2)
        c = nengo.Ensemble(n_neurons=300, dimensions=5)
        nengo.Connection(a, c[:3])
        nengo.Connection(b, c[3:])
    nengo.Connection(stim_a, a)
    nengo.Connection(stim_b, b)

    part2 = nengo.networks.EnsembleArray(n_neurons=50, n_ensembles=5)

    nengo.Connection(c, part2.input)
