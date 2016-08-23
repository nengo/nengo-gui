# Question Answering with Memory

# This model shows a form of question answering with memory. It binds two 
# features (color and shape) by circular convolution and stores them in a memory 
# population. It then provides a cue to the model at a later time to 
# determine the feature bound to that cue by deconvolution. This model exhibits 
# better cognitive ability since the answers to the questions are provided at a 
# later time and not at the same time as the questions themselves.

# **Note: A simplified method of building the model using the spa (semantic 
# pointer architecture) package in Nengo 2.0 is shown in the 
# spa_question-memory.py file in the same folder. 

# This model has parameters as described in the book, with memory population 
# having 1000 neurons over 20 dimensions. The memory population is capable of 
# storing a vector over time and it uses an integrator network to do so as 
# discussed in the book.

# The color input presented to the model is RED and then BLUE for 0.25 seconds 
# each before being turned off. In the same way the shape input is CIRCLE and 
# then SQUARE for 0.25 seconds each. Thus, when you run the model, it will start 
# by binding RED and CIRCLE for 0.25 seconds and then binding BLUE and SQUARE 
# for 0.25 seconds. The cue for deconvolving bound semantic pointers will be 
# turned off for 0.5 seconds and then starts cycling through CIRCLE, RED, 
# SQUARE, and BLUE within each second. The model will be able to determine the 
# correct answer using the cue, even when the color and shape inputs have been 
# turned off. 

# Press the play button to run the simulation.
# The graphs of shape, color, bound and memory show that first RED * CIRCLE and 
# then BLUE * SQUARE are convolved (bound) and loaded into the memory population, 
# so after 0.5 seconds the memory represents the superposition 
# RED * CIRCLE + BLUE * SQUARE. The last plot shows that the output is most 
# similar to the semantic pointer bound to the current cue. For example, when 
# the cue is CIRCLE, the output is most similar to RED.  Again, this is much
# easier to see in the spa_question-memory.py example.

#Setup the environment
import numpy as np
import nengo
from nengo.spa import Vocabulary
from nengo.spa import Memory

dim=20         # Number of dimensions 
N_input=300    # Number of neurons in population
N_conv=70      # Number of neurons per dimension in bind/unbind populations
N_mem=50       # Number of neurons per dimension in memory population

#Creating the vocabulary
rng = np.random.RandomState(7)  
vocab = Vocabulary(dimensions=dim, rng=rng, max_similarity=0.1)

model = nengo.Network(label='Question Answering with Memory', seed=12)  
with model:
    #Ensembles
    A = nengo.Ensemble(n_neurons=N_input, dimensions=dim, label='color')
    B = nengo.Ensemble(n_neurons=N_input, dimensions=dim, label='shape')
    C = nengo.Ensemble(n_neurons=N_input, dimensions=dim, label='cue')
    D = nengo.Ensemble(n_neurons=N_input, dimensions=dim, label='bound')
    E = nengo.Ensemble(n_neurons=N_input, dimensions=dim, label='output')
    
    #Creating memory population and connecting ensemble D to it
    tau = 0.4
    memory = nengo.networks.EnsembleArray(n_neurons=N_mem, n_ensembles=dim, 
                                            label='Memory')
    nengo.Connection(memory.output, memory.input, synapse=tau)     
    nengo.Connection(D, memory.input, synapse=0.01)
    
    #Creating the Bind network
    bind = nengo.networks.CircularConvolution(n_neurons=N_conv, dimensions=dim)
    nengo.Connection(A, bind.A)
    nengo.Connection(B, bind.B)
    nengo.Connection(bind.output, D) 
    
    #Creating the Unbind network
    unbind = nengo.networks.CircularConvolution(n_neurons=N_conv,  
                                        dimensions=dim, invert_a=True)
    nengo.Connection(C, unbind.A)
    nengo.Connection(memory.output, unbind.B)
    nengo.Connection(unbind.output, E)
    
    #Getting semantic pointer values
    CIRCLE=vocab.parse('CIRCLE').v
    BLUE=vocab.parse('BLUE').v
    RED=vocab.parse('RED').v
    SQUARE=vocab.parse('SQUARE').v
    ZERO=[0]*dim
    
    #function for providing color input
    def color_input(t):
        if t < 0.25:
            return RED
        elif t < 0.5:
            return BLUE
        else:
            return ZERO

    #function for providing shape input
    def shape_input(t):
        if t < 0.25:
            return CIRCLE
        elif t < 0.5:
            return SQUARE
        else:
            return ZERO

    #function for providing the cue
    def cue_input(t):
        if t < 0.5:
            return ZERO
        sequence = [ZERO, CIRCLE, RED, ZERO, SQUARE, BLUE]
        idx = int(((t - 0.5) // (1. / len(sequence))) % len(sequence))
        return sequence[idx]

    
    #Defining inputs
    inputA = nengo.Node(output=color_input, size_out=dim)
    inputB = nengo.Node(output=shape_input, size_out=dim)
    inputC = nengo.Node(output=cue_input, size_out=dim)
    
    #Connecting input to ensembles
    nengo.Connection(inputA, A)
    nengo.Connection(inputB, B)
    nengo.Connection(inputC, C)
