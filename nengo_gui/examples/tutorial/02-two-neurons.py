# Tutorial 2: Two neurons

# Now we show what happens with two neurons.  Notice that the neurons
# respond very differently to the two inputs.  One neuron responds more
# strongly to positive values, while the other responds more to negative
# values.  This is typical of real neurons (sometimes called "on" and "off"
# neurons).

# Given these two neurons, more information is available about what the input
# is.  The bottom graph shows the "decoded" value found by taking the output
# of both neurons and combining them.  Notice that these two neurons do a
# slightly better job of representing the input than just one neuron.


import nengo

model = nengo.Network()
with model:
    stim = nengo.Node(0)
    ens = nengo.Ensemble(n_neurons=2, dimensions=1, seed=5)
    nengo.Connection(stim, ens)
