# Tutorial 3: Many neurons

# Brains have many neurons.  What happens if we use 20 neurons? 50? 100?

# The code below shows 20 neurons in a group (we call groups of neurons
# an "Ensemble" of neurons).  The representation is much more accurate.
# To see this, press Play.  Now, as you move the slider, the bottom graph
# should follow your movements well.

# Try changing the number of neurons by editing the code below where it says
# "n_neurons=20".  Try 50.  Try 100.  The representation should get more and
# more accurate.

# Nengo Tip: Don't use too big a number!  Depending on your computer, using
# more than 1000 neurons in a single Ensemble can take a long time to compute.
# This is because Nengo needs to figure out how to weight the outputs of all
# the individual neurons (what we call "decoders"), in order to get the bottom
# graph.

import nengo

model = nengo.Network()
with model:
    stim = nengo.Node(0)
    ens = nengo.Ensemble(n_neurons=20, dimensions=1)
    nengo.Connection(stim, ens)
