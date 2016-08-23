# Question Answering with Memory using SPA

# Now we will build this model again, using the spa (semantic pointer 
# architecture) package built into Nengo 2.0.

# Press the play button to run the simulation.
# Graphs show the colour, shape and cue inputs. The last graph
# shows that the output is most similar to the semantic pointer which was 
# initially bound to the given cue. For example, when SQUARE is 
# provided as a cue, the output is most similar to BLUE.

import nengo
import nengo.spa as spa
from nengo.spa import Vocabulary
import numpy as np

D = 32  # the dimensionality of the vectors
rng = np.random.RandomState(7)
vocab = Vocabulary(dimensions=D, rng=rng, max_similarity=0.1)

#Adding semantic pointers to the vocabulary
CIRCLE=vocab.parse('CIRCLE')
BLUE=vocab.parse('BLUE')
RED=vocab.parse('RED')
SQUARE=vocab.parse('SQUARE')
ZERO=vocab.add('ZERO', [0]*D)

model = spa.SPA(label="Question Answering with Memory", vocabs=[vocab])
with model:
    
    model.A = spa.State(D, label="color")
    model.B = spa.State(D, label="shape")
    model.C = spa.State(D, label="cue")
    model.D = spa.State(D, label="bound")
    model.E = spa.State(D, label="output")
    model.memory = spa.State(D, feedback=1, label="memory")

    actions = spa.Actions(
        'D = A * B',
        'memory = D',
        'E = memory * ~C'
        )
 
    model.cortical = spa.Cortical(actions)
    
    #function for providing color input
    def color_input(t):
        if t < 0.25:
            return 'RED'
        elif t < 0.5:
            return 'BLUE'
        else:
            return 'ZERO'

    #function for providing shape input
    def shape_input(t):
        if t < 0.25:
            return 'CIRCLE'
        elif t < 0.5:
            return 'SQUARE'
        else:
            return 'ZERO'

    #function for providing the cue
    def cue_input(t):
        if t < 0.5:
            return 'ZERO'
        sequence = ['ZERO', 'CIRCLE', 'RED', 'ZERO', 'SQUARE', 'BLUE']
        idx = int(((t - 0.5) // (1. / len(sequence))) % len(sequence))
        return sequence[idx]

    
    #Inputs
    model.input = spa.Input(A=color_input, B=shape_input, C=cue_input)   