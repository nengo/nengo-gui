# Arbitrary Linear Transformation

# This model shows that any linear transformation between ensembles can be
# easily computed by selecting an appropriate value for the "transform". It
# provides an example of computing linear transformations using vector
# representations.

# Network diagram:  [input - 2D] ---> (x - 2d) ---> (z - 3D)
# A two-dimensional input signal is first fed into a two-dimensional neuronal
# ensemble x, which then projects it on to another three-dimensional ensemble z.

# This model contains the parameters as described in the book. Setting the
# transform equal to the 'weight_matrix' is analogous to entering the weights
# in the "2 to 3 Coupling Matrix" window in Nengo 1.4 GUI as described in the
# book.

# Press the play button to run the simulation.
# The graphs show a two-dimesional input linearly projected on to a
# two-dimensional ensemble of neurons (ens_X), which further linearly projects it on
# to a three-dimesional neuronal ensemble (ens_Z). You can use the sliders to change
# the input values provided by the input node.

import nengo

# Setup the environment
import numpy as np

# Create the network object to which we can add ensembles, connections, etc.
model = nengo.Network(label="Arbitrary Linear Transformation")

with model:
    # Two-dimensional input signal with constant value of [0.5, -0.5]
    stim = nengo.Node([0.5, -0.5], label="Input")

    # 2 and 3-dimensional ensembles each with 200 LIF neurons
    ens_X = nengo.Ensemble(200, dimensions=2, label="X")
    ens_Z = nengo.Ensemble(200, dimensions=3, label="Z")

    # Connect the input to ensemble x
    nengo.Connection(stim, ens_X)

    # Connect ensemble x to ensemble z using a weight matrix
    weight_matrix = [[0.0, 1.0], [1.0, 0.0], [0.5, 0.5]]
    nengo.Connection(ens_X, ens_Z, transform=weight_matrix)
