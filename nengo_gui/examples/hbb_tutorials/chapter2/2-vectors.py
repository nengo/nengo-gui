# Representing a Vector

# In nengo, ensembles of neurons represent information. In this model,
# you will represent a two-dimensional vector with a single ensemble of
# LIF (leaky integrate-and-fire) neurons. Though this is a case of
# two-dimensional vector representation, but the ideas naturally
# generalize to any number of dimensions.

# This model has paramenters as described in the book, with the neurons
# in the ensemble having two dimensions. Since the default max rates in
# Nengo 2.0 are (200, 400), so you have to explicitly specify them to be
# (100, 200) to create the same model as in the book. The default values
# of tauRC, tauRef, intercepts, radius and expected noise in Nengo 2.0
# are same as those mentioned in the book.

# Press the play button to run the simulation.
# The cos and sin graphs show the two dimensional input provided to the
# ensemble and the top right graph shows the the decoded estimate of this
# two dimensional input. The graph on bottom right shows the XY-value i.e.,
# the state represented by one dimension of the ensemble vs the state
# represented by the other dimension.

# Grab and move the sliders to manually control the input to the neurons.

import nengo

# Setup the envirnment
import numpy as np
from nengo.dists import Uniform

# Create the network object to which we can add ensembles, connections, etc.
model = nengo.Network(label="2D Representation")

with model:
    # Input Nodes
    stim_sin = nengo.Node(output=np.sin, label="sin")
    stim_cos = nengo.Node(output=np.cos, label="cos")

    # Ensemble with 100 LIF neurons which represents a 2-dimensional signal
    x = nengo.Ensemble(100, dimensions=2, max_rates=Uniform(100, 200))

    # Get the neuron encoders
    encoders = x.encoders.sample(100, 2)

    # Connecnting input to ensemble
    # The indices in ensemble 'x' define which dimension the input will project to
    nengo.Connection(stim_sin, x[0])
    nengo.Connection(stim_cos, x[1])
