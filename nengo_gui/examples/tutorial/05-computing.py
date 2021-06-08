# Tutorial 5: Computing a function

# Whenever we make a Connection between groups of neurons, we don't have to
# just pass the information from one group of neurons to the next.  Instead,
# we can also modify that information.  We do this by specifying a function,
# and Nengo will connect the individual neurons to best approximate that
# function.

# In the example here, we are computing the square of the value.  So for an
# input of -1 it should output 1, for 0 it should output 0, and for 1 it should
# output 1.

# You can change the function by adjusting the computations done in the
# part of the code labelled "compute_this".  This can be any arbitrary Python
# function.  For example, try computing the negative of x ("return -x").  Try
# the absolute value ("return abs(x)").  You can also try more complex
# functions like "return 1 if x > 0 else 0".

import nengo

model = nengo.Network()
with model:
    stim = nengo.Node(0)
    a = nengo.Ensemble(n_neurons=50, dimensions=1)
    nengo.Connection(stim, a)

    b = nengo.Ensemble(n_neurons=50, dimensions=1)

    def compute_this(x):
        return x * x

    nengo.Connection(a, b, synapse=0.01, function=compute_this)
