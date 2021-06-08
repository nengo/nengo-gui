# Tutorial 7: Multiple Dimensions

# Ensembles of neurons do not just have to represent one thing.  Instead,
# a group of neurons can represent multiple values at the same time.  We call
# the number of values represented at once the "dimensions" of the Ensemble.
# So, if a group of neurons is supposed to represent the spatial location of
# something in three dimensions (x, y, z), then we say that it has dimensions=3.

# In this case, three different values are being decoded from each of the
# groups of neurons.  Nengo decodes these values by finding different ways
# of weighting together the actual spiking output (top graphs) in order to
# produce the bottom graphs.

# Nengo Tip: If you change the number of dimensions, the graphs and sliders
# may not update to reflect those changes.  You can force them to do so by
# removing them and re-creating them.  To remove them, right-click on the graph
# or slider and select "Remove".  To re-create them, right-click on the item
# you want to make a graph for and select an option.  "Slider" makes the
# sliders for controlling input; "Value" shows the decoded value being
# represented; and "Spikes" shows the individual spiking activity of the
# neurons.

import nengo

model = nengo.Network()
with model:
    stim = nengo.Node([0, 0, 0])
    a = nengo.Ensemble(n_neurons=200, dimensions=3)
    nengo.Connection(stim, a)

    b = nengo.Ensemble(n_neurons=200, dimensions=3)
    nengo.Connection(a, b)
