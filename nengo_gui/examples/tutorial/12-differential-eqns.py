# Tutorial 12: Differential Equations

# Recurrent connections can be used to implement not just memory, as in the
# previous tutorial, but also any differential equation.

# For example, the differential equation for a low-pass filter (a system where
# the output y is a smoothed version of the input x) is
#     dy/dt = x/tau - y/tau
# where tau is the time constant for the smoothing (larger means smoother)

# To implement this in nengo, we need an input Connection that computes the
# x/tau part, and a recurrent Connection that computes the -y/tau part.

# Because these functions are implemented by neurons, the time constant of
# the synapse itself turns out to be very important here.  We have to take into
# account what synapse is being used when making this connection.

# While the proof is outside the scope of this tutorial, the resulting rule
# is that both your Connections need to get scaled by the synapse value, and
# your recurrent Connection must also add the stored value back in.  That is,
# in this case, the input part of the equation becomes
#      (x/tau) * synapse
# and the recurrent part becomes
#      (-y/tau) * synapse + y
# If we tell Nengo to implement those two functions, we will get the desired
# differential equation.

# Nengo Tip:  In this particular case, those two functions are both linear
# functions, and so we could implement them much more easily using the
# "transform=" approach (see tutorial 10).  This is left as an exercise to the
# user.

# Try running the model and seeing that y is a slowed-down, smoother version
# of x.  What happens if you change the input up and down quickly?  What
# happens with tau=0.1?  What about tau=0.01?

import nengo

model = nengo.Network()
with model:
    stim_x = nengo.Node(0)
    x = nengo.Ensemble(n_neurons=50, dimensions=1)
    nengo.Connection(stim_x, x)

    y = nengo.Ensemble(n_neurons=50, dimensions=1)
    tau = 0.5
    synapse = 0.1

    def input_function(x):
        return x / tau * synapse

    def recurrent_function(y):
        return (-y / tau) * synapse + y

    nengo.Connection(x, y, synapse=synapse, function=input_function)
    nengo.Connection(y, y, synapse=synapse, function=recurrent_function)
