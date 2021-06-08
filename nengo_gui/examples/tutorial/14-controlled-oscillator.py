# Tutorial 14: Controlled Oscillator

# Here we do the exact same oscillator as in the previous example, but we
# introduce a new dimension that lets us control the speed of the oscillation

# We use the same differential equation as before:
#    dx0/dt = -x1 * s + x0 * (r - x0**2 - y0**2)
#    dx1/dt =  x0 * s + x1 * (r - x0**2 - y0**2)
# where r is the radius of the circle and s is the speed (in radians per
# second).

# But, in this case, we make the Ensemble be 3-dimensional and use the third
# dimension (x[2]) to represent s.  You can control it with a separate input.
# This shows how neurons can affect the pattern of activity of another
# group of neurons.


import nengo

model = nengo.Network()
with model:

    x = nengo.Ensemble(n_neurons=400, dimensions=3)

    synapse = 0.1

    def oscillator(x):
        r = 1
        s = 10 * x[2]
        return [
            synapse * -x[1] * s + x[0] * (r - x[0] ** 2 - x[1] ** 2) + x[0],
            synapse * x[0] * s + x[1] * (r - x[0] ** 2 - x[1] ** 2) + x[1],
        ]

    nengo.Connection(x, x[:2], synapse=synapse, function=oscillator)

    stim_speed = nengo.Node(0)
    speed = nengo.Ensemble(n_neurons=50, dimensions=1)
    nengo.Connection(stim_speed, speed)
    nengo.Connection(speed, x[2])
