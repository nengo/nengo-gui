# Tutorial 9: Multiplication

# Now that we can combine information, we can use this to compute more
# complex functions.  For example, to multiply two numbers together, we
# first make a combined Ensemble as in the previous tutorial, and then we
# compute the pruduct of the two numbers by multiplying them together when
# we make a Connection out of that combined Ensemble.

# Notice that we had to increase the radius of the combined Ensemble to 1.5.
# That is because it is representing two values, each of which can be in the
# range -1 to 1.  In order to make sure the Ensemble is good at representing
# both values, we need to make sure the radius is large enough to include the
# point [1, 1].  This requires a radius of sqrt(2), or around 1.5.

import nengo

model = nengo.Network()
with model:
    stim_a = nengo.Node(0)
    a = nengo.Ensemble(n_neurons=50, dimensions=1)
    nengo.Connection(stim_a, a)

    stim_b = nengo.Node(0)
    b = nengo.Ensemble(n_neurons=50, dimensions=1)
    nengo.Connection(stim_b, b)

    c = nengo.Ensemble(n_neurons=200, dimensions=2, radius=1.5)
    nengo.Connection(a, c[0])
    nengo.Connection(b, c[1])

    d = nengo.Ensemble(n_neurons=50, dimensions=1)

    def multiply(x):
        return x[0] * x[1]

    nengo.Connection(c, d, function=multiply)
