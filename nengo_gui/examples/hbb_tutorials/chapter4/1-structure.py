# Structured Representations

# This model shows a method for constructing structured representations
# using semantic pointers (high-dimensional neural vector representations). It
# uses a convolution network to bind two Semantic Pointers and a Sum
# network to cojoin two semantic pointers.

# **Note: This model can be simplified if built using the spa (semantic
# pointer architecture) package in Nengo 2.0. This method is shown in the
# spa_structure.py file in the same folder.

# This model has parameters as described in the book, with the ensembles
# having 20 dimensions and 300 neurons each. You will use the
# 'nengo.networks.CircularConvolution' class in Nengo 2.0 to compute the
# convolution (or binding) of two semantic pointers A and B.

# Since the collection of named vectors in a space forms a kind of "vocabulary"
# as described in the book, you will create a vocabulary to build structured
# representations out of it.

# Press the play button to run the simulation.
# The value graphs show the value of individual components of their respective
# ensembles. They show the same information as the "value" graphs in the
# Interactive Plots in Nengo 1.4 GUI as described in the book.

# Sum looks similar to B and A, whereas C looks very dissimilar because it
# is the result of a circular convolution.

import nengo

# Setup the environment
import numpy as np
from nengo.spa import Vocabulary

dim = 20  # Number of dimensions
n_neurons = 300  # Number of neurons in each ensemble

# Creating a vocabulary
rng = np.random.RandomState(0)
vocab = Vocabulary(dimensions=dim, rng=rng)

# Create the network object to which we can add ensembles, connections, etc.
model = nengo.Network(label="Structured Representation")
with model:
    # Input - Get the raw vectors for the pointers using `vocab['A'].v`
    input_A = nengo.Node(output=vocab["A"].v, label="Input A")
    input_B = nengo.Node(output=vocab["B"].v, label="Input B")

    # Ensembles with 300 neurons and 20 dimensions
    # Represents input_A
    ens_A = nengo.Ensemble(n_neurons, dimensions=dim, label="A")
    # Represents input_B
    ens_B = nengo.Ensemble(n_neurons, dimensions=dim, label="B")

    # Represents the convolution of A and B
    ens_C = nengo.Ensemble(n_neurons, dimensions=dim, label="C")
    # Represents the sum of A and B
    ens_sum = nengo.Ensemble(n_neurons, dimensions=dim, label="Sum")

    # Creating the circular convolution network with 70 neurons per dimension
    net_bind = nengo.networks.CircularConvolution(70, dimensions=dim, label="Bind")

    # Connecting the input to ensembles A and B
    nengo.Connection(input_A, ens_A)
    nengo.Connection(input_B, ens_B)

    # Projecting ensembles A and B to the Bind network
    nengo.Connection(ens_A, net_bind.A)
    nengo.Connection(ens_B, net_bind.B)
    nengo.Connection(net_bind.output, ens_C)

    # Projecting ensembles A and B to the Sum ensemble
    nengo.Connection(ens_A, ens_sum)
    nengo.Connection(ens_B, ens_sum)
