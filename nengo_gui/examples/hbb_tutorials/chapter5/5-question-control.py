# Question Answering with Control

# This model shows a form of question answering where statements and
# questions are supplied through a single 'visual input' and the replies
# are produced in a 'motor output' as discussed in the book. You will
# implement this by using the basal ganglia to store and retrieve
# information from working memory in response to visual input. More
# specifically, the basal ganglia decides what to do with the information
# in the visual channel based on its content (i.e. whether it is a
# statement or a question).

# **Note: Simplified method of building the model using the spa (semantic
# pointer architecture) package in Nengo 2.0 is shown in the
# spa_question-control.py file in the same folder.

# This model has parameters as described in the book. Note that in Nengo 1.4,
# network arrays were used to construct this model for computational reasons
# as explained in the book. Nengo 2.0 has 'EnsembleArray' as an equivalent to
# network arrays which you will use in this model.

# When you run the model, it will start by binding RED and CIRCLE and then
# binding BLUE and SQUARE so the memory essentially has
# RED * CIRCLE + BLUE * SQUARE. This is stored in memory because the model is
# told that RED * CIRCLE is a STATEMENT (i.e. RED * CIRCLE + STATEMENT in the
# code) as is BLUE * SQUARE. Then it is presented with something like
# QUESTION + RED (i.e., "What is red?"). The basal ganglia then reroutes that
# input to be compared to what is in working memory and the result shows up in
# the motor channel.

# Press the play button to run the simulation.
# The graphs show that when the input to the Visual system is a STATEMENT,
# there is no response from the Motor system and the input is stored in the
# Memory. However, when the input to the Visual system is a QUESTION, the Motor
# system responds with the appropriate answer. For instance, when the input to
# Visual system is CIRCLE the output from the motor system is RED.


import nengo

# Setup the environment
import numpy as np
from nengo.dists import Uniform
from nengo.spa import Vocabulary

dim = 100  # Number of dimensions
n_neurons = 30  # Neurons per dimension
n_conv = 70  # Number of neurons per dimension in bind/unbind populations
n_mem = 50  # Number of neurons per dimension in memory population

# Defining a zero vector having length equal to the number of dimensions
ZERO = [0] * dim

# Creating the vocabulary
rng = np.random.RandomState(15)
vocab = Vocabulary(dimensions=dim, rng=rng, max_similarity=0.05)

# Create the network object to which we can add ensembles, connections, etc.
model = nengo.Network(label="Question Answering with Control", seed=15)
with model:
    # Ensembles
    visual = nengo.networks.EnsembleArray(
        n_neurons=n_neurons,
        n_ensembles=dim,
        max_rates=Uniform(100, 300),
        label="Visual",
    )
    channel = nengo.networks.EnsembleArray(
        n_neurons=n_neurons, n_ensembles=dim, label="Channel"
    )
    motor = nengo.networks.EnsembleArray(
        n_neurons=n_neurons, n_ensembles=dim, label="Motor"
    )

    # Creating a memory (integrator)
    tau = 0.1
    memory = nengo.networks.EnsembleArray(
        n_neurons=n_mem, n_ensembles=dim, label="Memory"
    )
    nengo.Connection(memory.output, memory.input, synapse=tau)

    # Function for providing visual input
    def visual_input(t):
        if 0.1 < t < 0.3:
            return vocab.parse("STATEMENT+RED*CIRCLE").v
        elif 0.35 < t < 0.5:
            return vocab.parse("STATEMENT+BLUE*SQUARE").v
        elif 0.55 < t < 0.7:
            return vocab.parse("QUESTION+BLUE").v
        elif 0.75 < t < 0.9:
            return vocab.parse("QUESTION+CIRCLE").v
        return ZERO

    # Function for flipping the output of the thalamus
    def x_biased(x):
        return [1 - x]

    # Providing input to the model
    vis_stim = nengo.Node(output=visual_input, size_out=dim, label="Input stimulus")
    nengo.Connection(vis_stim, visual.input)

    nengo.Connection(visual.output, channel.input, synapse=0.02)
    nengo.Connection(channel.output, memory.input)

    # Creating the unbind network
    unbind = nengo.networks.CircularConvolution(
        n_neurons=n_conv, dimensions=dim, invert_a=True
    )
    nengo.Connection(visual.output, unbind.A)
    nengo.Connection(memory.output, unbind.B)
    nengo.Connection(unbind.output, motor.input)

    # Creating the basal ganglia and the thalamus network
    bg = nengo.networks.BasalGanglia(dimensions=2)
    thal = nengo.networks.Thalamus(dimensions=2)
    nengo.Connection(bg.output, thal.input, synapse=0.01)

    # Defining the transforms for connecting the visual input to the BG
    trans0 = np.matrix(vocab.parse("STATEMENT").v)
    trans1 = np.matrix(vocab.parse("QUESTION").v)
    nengo.Connection(visual.output, bg.input[0], transform=trans0)
    nengo.Connection(visual.output, bg.input[1], transform=trans1)

    # Connecting thalamus output to the two gates gating the channel and the motor
    # populations
    passthrough = nengo.Ensemble(n_neurons, 2)
    nengo.Connection(thal.output, passthrough)

    gate0 = nengo.Ensemble(n_neurons, 1, label="Gate0")
    nengo.Connection(passthrough[0], gate0, function=x_biased, synapse=0.01)
    gate1 = nengo.Ensemble(n_neurons, 1, label="Gate1")
    nengo.Connection(passthrough[1], gate1, function=x_biased, synapse=0.01)

    for ensemble in channel.ea_ensembles:
        nengo.Connection(gate0, ensemble.neurons, transform=[[-3]] * gate0.n_neurons)

    for ensemble in motor.ea_ensembles:
        nengo.Connection(gate1, ensemble.neurons, transform=[[-3]] * gate1.n_neurons)
