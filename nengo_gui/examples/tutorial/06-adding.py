# Tutorial 6: Adding

# If we make two Connections into the same Ensemble, the Ensemble will get
# input from both sources, and it will end up representing the sum of all of
# its inputs.  Here, we use this to add two values together.

# Notice that the value being represented by Ensemble c is, most of the time,
# the sum of the two inputs (a and b).  However, if that value gets too large
# (or too small), it does not work very well.  This is because every Ensemble
# has a particular range of values that it expects to work with.  We call this
# the "radius" of the Ensemble, and the default radius is 1, which means that
# the Ensemble is best at representing values between -1 and 1.  You can
# change this radius by adjusting the value specified below.  Try changing it
# so that it says "radius=2".  Now the neurons will be good at representing
# -2 to 2.  However, in order to see that on the graph for Ensemble c, you
# will have to adjust the range it is displaying.  Right-click on the graph,
# select "Set range" and set it to "-2,2".  Now it should add correctly over
# the full range of inputs.


import nengo

model = nengo.Network()
with model:
    stim_a = nengo.Node(0)
    a = nengo.Ensemble(n_neurons=50, dimensions=1)
    nengo.Connection(stim_a, a)

    stim_b = nengo.Node(0)
    b = nengo.Ensemble(n_neurons=50, dimensions=1)
    nengo.Connection(stim_b, b)

    c = nengo.Ensemble(n_neurons=50, dimensions=1, radius=1)
    nengo.Connection(a, c)
    nengo.Connection(b, c)
