# Question Answering using SPA

# Now we will build the model again, using the spa (semantic pointer
# architecture) package built into Nengo 2.0. You will see that using the spa
# package considerably simplifies model construction and visualization through
# nengo_gui.

# Press the play button to run the simulation.
# Graphs show the colour, shape and cue inputs. The last graph
# shows that the output is most similar to the semantic pointer bound to the
# current cue. For example, when RED and CIRCLE are being bound
# and the cue is CIRCLE, the output is most similar to RED.

# Setup the environment
import nengo
import nengo.spa as spa
import numpy as np
from nengo.spa import Vocabulary

dim = 32  # The dimensionality of the vectors
rng = np.random.RandomState(4)
vocab = Vocabulary(dimensions=dim, rng=rng, max_similarity=0.1)

# Adding semantic pointers to the vocabulary
CIRCLE = vocab.parse("CIRCLE")
BLUE = vocab.parse("BLUE")
RED = vocab.parse("RED")
SQUARE = vocab.parse("SQUARE")
ZERO = vocab.add("ZERO", [0] * dim)

# Create the spa.SPA network to which we can add SPA objects
model = spa.SPA(label="Question Answering", vocabs=[vocab])
with model:
    model.A = spa.State(dim)
    model.B = spa.State(dim)
    model.C = spa.State(dim)
    model.D = spa.State(dim)
    model.E = spa.State(dim)

    actions = spa.Actions(
        "D = A * B",
        "E = D * ~C",
    )

    model.cortical = spa.Cortical(actions)

    # Function for providing color input
    def color_input(t):
        if (t // 0.5) % 2 == 0:
            return "RED"
        return "BLUE"

    # Function for providing shape input
    def shape_input(t):
        if (t // 0.5) % 2 == 0:
            return "CIRCLE"
        return "SQUARE"

    # Function for providing the cue
    def cue_input(t):
        sequence = ["ZERO", "CIRCLE", "RED", "ZERO", "SQUARE", "BLUE"]
        idx = int((t // (1.0 / len(sequence))) % len(sequence))
        return sequence[idx]

    # Inputs
    model.input = spa.Input(A=color_input, B=shape_input, C=cue_input)
