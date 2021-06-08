# Tutorial 16: Ensemble Properties

# In addition to the number of neurons, the number of dimensions, and the
# radius, there are other parameters that can be specified when creating an
# Ensemble.  Here are a few that may be useful.

# max_rates
#    Each neuron has a different maximum firing rate, and this parameter
#    specifies the random distribution controlling this.  The default is
#    a uniform distribution between 200Hz and 400Hz.

# encoders
#    Each neuron has a different preferred stimulus.  For a 1-dimensional
#    Ensemble, this means that half of the neurons prefer -1 and the other
#    half prefer +1.  This is why some neurons fire more for large values and
#    some for small values.  In the example below, we set all the encoders to
#    be +1.

# intercepts
#    Each neuron only starts firing when the similarity between the value and
#    its preferred value reaches a particular limit.  This is normally a
#    uniform distribution between -1 and 1.  Notice that if you set it to a
#    range like 0.5 to 1, then no neurons at all will fire for any values
#    between -0.5 and 0.5.  This means that any value between -0.5 and 0.5
#    will get reduced to exactly zero, which can be useful.

import nengo

model = nengo.Network()
with model:

    stim = nengo.Node(0)

    a = nengo.Ensemble(n_neurons=50, dimensions=1)

    b = nengo.Ensemble(
        n_neurons=50, dimensions=1, max_rates=nengo.dists.Uniform(50, 100)
    )

    c = nengo.Ensemble(n_neurons=50, dimensions=1, encoders=nengo.dists.Choice([[1]]))

    d = nengo.Ensemble(
        n_neurons=50, dimensions=1, intercepts=nengo.dists.Uniform(0.5, 1.0)
    )

    nengo.Connection(stim, a)
    nengo.Connection(stim, b)
    nengo.Connection(stim, c)
    nengo.Connection(stim, d)
