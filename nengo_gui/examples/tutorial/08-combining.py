# Tutorial 8: Combining Information

# Now that we can represent multiple things using the same group of neurons,
# we can also combine information together.  Here we introduce a new syntax
# when making Connections: just can specify which of the multiple dimensions
# to use.  For example, "Connection(a, c[0])" says to take the single dimension
# in a and pass it into the first dimension in c.  (In Python, we always start
# counting at zero, so the first dimension is x[0], then x[1], then x[2], and
# so on).  You can also do this when connecting out of a group, so you could do
# something like "Connection(c[1], d[3])".

# In the example below, we combine the information from two different Ensembles
# (a and b) into a third one (c) that represents both values.  Notice that this
# is different than the Addition tutorial in that we are keeping both values
# separate, rather than adding them together.

# Advanced Nengo Tip: Connections support full Python slice notation, so you
# can also do things like [-1], or [1:5] or [::-1] and so on.

import nengo

model = nengo.Network()
with model:
    stim_a = nengo.Node(0)
    a = nengo.Ensemble(n_neurons=50, dimensions=1)
    nengo.Connection(stim_a, a)

    stim_b = nengo.Node(0)
    b = nengo.Ensemble(n_neurons=50, dimensions=1)
    nengo.Connection(stim_b, b)

    c = nengo.Ensemble(n_neurons=200, dimensions=2)
    nengo.Connection(a, c[0])
    nengo.Connection(b, c[1])
