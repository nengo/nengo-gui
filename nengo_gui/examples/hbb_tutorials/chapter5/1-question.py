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

# Setup the environment
import numpy as np
import nengo
from nengo.spa import Vocabulary

dim=20         # Number of dimensions 
N_input=300    # Number of neurons in population
N_conv=70      # Number of neurons per dimension in bind/unbind populations

rng = np.random.RandomState(7)
vocab = Vocabulary(dimensions=dim, rng=rng, max_similarity=0.1)
model = nengo.Network(label='Question Answering', seed=7)

with model:
    #Ensembles
    A = nengo.Ensemble(n_neurons=N_input, dimensions=dim, label='color')
    B = nengo.Ensemble(n_neurons=N_input, dimensions=dim, label='shape')
    C = nengo.Ensemble(n_neurons=N_input, dimensions=dim, label='cue')
    D = nengo.Ensemble(n_neurons=N_input, dimensions=dim, label='bound')
    E = nengo.Ensemble(n_neurons=N_input, dimensions=dim, label='output') 
    
    #Creating the bind network
    bind = nengo.networks.CircularConvolution(n_neurons=N_conv, dimensions=dim)
    nengo.Connection(A, bind.A)
    nengo.Connection(B, bind.B)
    nengo.Connection(bind.output, D) 
    
    #Creating the Unbind network
    unbind = nengo.networks.CircularConvolution(n_neurons=N_conv, 
                                    dimensions=dim, invert_a=True)
    nengo.Connection(C, unbind.A)
    nengo.Connection(D, unbind.B)
    nengo.Connection(unbind.output, E)

    #Getting semantic pointer values
    CIRCLE=vocab.parse('CIRCLE').v
    BLUE=vocab.parse('BLUE').v
    RED=vocab.parse('RED').v
    SQUARE=vocab.parse('SQUARE').v
    ZERO=[0]*dim
    
    #function for providing color input
    def color_input(t):
        if (t // 0.5) % 2 == 0:
            return RED
        else:
            return BLUE
        
    #function for providing shape input
    def shape_input(t):
        if (t // 0.5) % 2 == 0:
            return CIRCLE
        else:
            return SQUARE

    #function for providing the cue
    def cue_input(t):
        sequence = [ZERO, CIRCLE, RED, ZERO, SQUARE, BLUE]
        idx = int((t // (1. / len(sequence))) % len(sequence))
        return sequence[idx]
      
    #Defining inputs
    inputA = nengo.Node(output=color_input, size_out=dim)
    inputB = nengo.Node(output=shape_input, size_out=dim)
    inputC = nengo.Node(output=cue_input, size_out=dim)
    
    #Connecting input to ensembles
    nengo.Connection(inputA, A)
    nengo.Connection(inputB, B)
    nengo.Connection(inputC, C)
