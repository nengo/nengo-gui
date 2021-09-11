# Structured Representations using SPA

# Now we will build the model again, using the spa (semantic pointer
# architecture) package built into Nengo 2.0. You will see that using the spa
# package considerably simplifies model construction and visualization through
# nengo_gui.

# Press the play button to run the simulation.
# The graphs A and B show the semantic pointer representations in objects A and
# B respectively. Graphs labelled C show the result of the convolution operation
# (left - shows the semantic pointer representation in object C, right - shows
# the similarity with the vectors in the vocabulary). The graphs labelled Sum
# show the sum of A and B as represented by the object Sum (left - shows the
# semantic pointer representation in Sum, right - shows high similarity with
# vectors A and B).

# Setup the environment
import nengo
import nengo.spa as spa
import numpy as np
from nengo.spa import Vocabulary

dim = 32  # the dimensionality of the vectors

# Creating a vocabulary
rng = np.random.RandomState(0)
vocab = Vocabulary(dimensions=dim, rng=rng)
vocab.add("C", vocab.parse("A * B"))

# Create the spa.SPA network to which we can add SPA objects
model = spa.SPA(label="structure", vocabs=[vocab])
with model:
    model.A = spa.State(dim)
    model.B = spa.State(dim)
    model.C = spa.State(dim, feedback=1)
    model.Sum = spa.State(dim)

    actions = spa.Actions("C = A * B", "Sum = A", "Sum = B")

    model.cortical = spa.Cortical(actions)

    # Model input
    model.input = spa.Input(A="A", B="B")
