# Tutorial 1: A Single Neuron

# Here we show one single neuron.  The slider on the left adjusts the input
# to that neuron.  The top graph shows the voltage in the neuron.  When that
# voltage is high enough, the neuron "spikes", producing an output (middle
# graph).  That output releases neurotransmitter which is gradually
# reabsorbed.  Given only that neurotransmitter output, it is difficult
# to reconstruct the original input (bottom graph).

# User Interface Tip: You can adjust the amount of time shown on the graphs
# by dragging the left side of the gray bar inside the timeline at the bottom
# of the screen.  Try reducing it down to a smaller size so you can see
# the individual spikes better.

import nengo

model = nengo.Network()
with model:
    stim = nengo.Node(0)
    ens = nengo.Ensemble(n_neurons=1, dimensions=1, seed=5)
    nengo.Connection(stim, ens)
