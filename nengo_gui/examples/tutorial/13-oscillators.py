# Tutorial 13: Oscillators

# If we do differential equations in multiple dimensions, we can get
# oscillators.  This gives an Ensemble of neurons that can produce patterns
# of behaviour all on its own without any external input.  For example, here
# is a standard cycle in two dimensions:
#    dx0/dt = -x1 * s + x0 * (r - x0**2 - x1**2)
#    dx1/dt =  x0 * s + x1 * (r - x0**2 - x1**2)
# where r is the radius of the circle and s is the speed (in radians per second).

# As discussed in the previous tutorial, we can convert this into a Nengo
# model.  In this case there is no input connection, so all we have to do
# is multiply by the synapse and add the original value.

# Here we introduce a new kind of plot.  The XY-value plot shows the same
# information as the normal Value plot, but plots the two dimensions together
# rather than using time to be the x-axis.  This can be convenient for
# representing multidimensional data.

# Try adjusting the r value to 0.5.  Try 1.5.  What about 0?
# Try adjusting the speed s.  What happens when it is very slow (0.5)?  0.1?

import nengo

model = nengo.Network()
with model:

    x = nengo.Ensemble(n_neurons=200, dimensions=2)

    synapse = 0.1

    def oscillator(x):
        r = 1
        s = 6
        return [
            synapse * (-x[1] * s + x[0] * (r - x[0] ** 2 - x[1] ** 2)) + x[0],
            synapse * (x[0] * s + x[1] * (r - x[0] ** 2 - x[1] ** 2)) + x[1],
        ]

    nengo.Connection(x, x, synapse=synapse, function=oscillator)
