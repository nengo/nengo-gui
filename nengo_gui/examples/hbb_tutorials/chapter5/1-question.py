# Question Answering

# This model shows a simple form of question answering. The goal of
# this model is to build a network that will output answers to questions
# based on supplied statements as described in the book. You will bind
# two features (color and shape) by circular convolution. Then you will provide
# a cue to the model to determine either one of the features by deconvolution.

# **Note: Simplified method of building the model using the spa
# (semantic pointer architecture) package in Nengo 2.0 is shown
# in the spa_question.py file in the same folder.

# This model has parameters as described in the book, with the ensembles having
# 300 neurons in 20 dimensions and the bind and unbind networks having 70
# neurons per dimension. The model relies on SPA (Semantic Pointer Architecture)
# methods for charachterizing representation, transformation and control.

# Depending on your computer, this model may run slowly which can be avoided by
# several ways as discussed in the book. In order to run the model in direct
# mode (explained in the book), the parameter 'neuron_type' should be set to
# nengo.Direct() while creating the ensembles.

# As mentioned in the book, the color input will alternate every 0.5 seconds
# between RED and BLUE. In the same way the shape input alternates between
# CIRCLE and SQUARE. Thus, the model will bind alternatingly RED * CIRCLE and
# BLUE * SQUARE for 0.5 seconds each. In parallel you will ask a question from
# the model by providing a cue which will be used for deconvolving bound
# semantic pointers to determine an answer. For example, when the cue is CIRCLE
# the model will respond with RED. The cue will cycle through CIRCLE, RED,
# SQUARE, and BLUE within one second.

# Press the play button to run the simulation.
# The graph labelled "output" shows that the output is most similar to the semantic
# pointer bound to the current cue. For example, when RED and CIRCLE are being
# bound and the cue is CIRCLE, the output is most similar to RED.  This is much
# easier to see in the spa_question.py version.

import nengo

# Setup the environment
import numpy as np
from nengo.spa import Vocabulary

dim = 20  # Number of dimensions
n_neurons = 300  # Number of neurons in population
n_conv = 70  # Number of neurons per dimension in bind/unbind populations

rng = np.random.RandomState(0)
vocab = Vocabulary(dimensions=dim, rng=rng, max_similarity=0.1)
model = nengo.Network(label="Question Answering", seed=7)

with model:
    # Ensembles
    ens_A = nengo.Ensemble(n_neurons=n_neurons, dimensions=dim, label="A")
    ens_B = nengo.Ensemble(n_neurons=n_neurons, dimensions=dim, label="B")
    ens_C = nengo.Ensemble(n_neurons=n_neurons, dimensions=dim, label="C")
    ens_D = nengo.Ensemble(n_neurons=n_neurons, dimensions=dim, label="D")
    ens_E = nengo.Ensemble(n_neurons=n_neurons, dimensions=dim, label="E")

    # Creating the bind network
    net_bind = nengo.networks.CircularConvolution(n_neurons=n_conv, dimensions=dim)
    nengo.Connection(ens_A, net_bind.A)
    nengo.Connection(ens_B, net_bind.B)
    nengo.Connection(net_bind.output, ens_D)

    # Creating the Unbind network
    net_unbind = nengo.networks.CircularConvolution(
        n_neurons=n_conv, dimensions=dim, invert_a=True
    )
    nengo.Connection(ens_C, net_unbind.A)
    nengo.Connection(ens_D, net_unbind.B)
    nengo.Connection(net_unbind.output, ens_E)

    # Getting semantic pointer values
    CIRCLE = vocab.parse("CIRCLE").v
    BLUE = vocab.parse("BLUE").v
    RED = vocab.parse("RED").v
    SQUARE = vocab.parse("SQUARE").v
    ZERO = [0] * dim

    # Function for providing color input
    def color_input(t):
        if (t // 0.5) % 2 == 0:
            return RED
        return BLUE

    # Function for providing shape input
    def shape_input(t):
        if (t // 0.5) % 2 == 0:
            return CIRCLE
        return SQUARE

    # Function for providing the cue
    def cue_input(t):
        sequence = [ZERO, CIRCLE, RED, ZERO, SQUARE, BLUE]
        idx = int((t // (1.0 / len(sequence))) % len(sequence))
        return sequence[idx]

    # Defining inputs
    input_A = nengo.Node(output=color_input, size_out=dim, label="Input A")
    input_B = nengo.Node(output=shape_input, size_out=dim, label="Input B")
    input_C = nengo.Node(output=cue_input, size_out=dim, label="Input C")

    # Connecting input to ensembles
    nengo.Connection(input_A, ens_A)
    nengo.Connection(input_B, ens_B)
    nengo.Connection(input_C, ens_C)
