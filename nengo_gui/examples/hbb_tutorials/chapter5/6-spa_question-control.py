# Question Answering with Control using SPA

# Now we will build this model again, using the spa (semantic pointer
# architecture) package built into Nengo 2.0.

# Press the play button to run the simulation.
# The top graph is the input to the visual subnet. When this input is a
# STATEMENT, there is no response shown in the motor graph and the input is
# stored in memory (shown in the memory graph).  To see bound pairs (e.g.
# RED*CIRCLE) in memory, you need to right-click on the memory graph and
# select 'show pairs'.  This can be cluttered but is more informative.
# When the input to 'visual' is a QUESTION, the motor graph shows the
# appropriate answer. For instance, when the input to visual is
# QUESTION+BLUE (showin in the visual graphs), the output from motor is SQUARE.
# Note this simulation is fairly sensitive to the dimensionality, you may
# need multiple runs or a higher dimension to get the expected results.

# Setup the environment
import nengo
import nengo.spa as spa
import numpy as np
from nengo.spa import Vocabulary

dim = 32  # The dimensionality of the vectors
rng = np.random.RandomState(11)
vocab = Vocabulary(dimensions=dim, rng=rng, max_similarity=0.1)

# Adding semantic pointers to the vocabulary
CIRCLE = vocab.parse("CIRCLE")
BLUE = vocab.parse("BLUE")
RED = vocab.parse("RED")
SQUARE = vocab.parse("SQUARE")
ZERO = vocab.add("ZERO", [0] * dim)

# Create the spa.SPA network to which we can add SPA objects
model = spa.SPA(label="Question Answering with Control", vocabs=[vocab])
with model:
    model.visual = spa.State(dim)
    model.motor = spa.State(dim)
    model.memory = spa.State(dim, feedback=1, feedback_synapse=0.1)

    actions = spa.Actions(
        "dot(visual, STATEMENT) --> memory=visual",
        "dot(visual, QUESTION) --> motor = memory * ~visual",
    )

    model.bg = spa.BasalGanglia(actions)
    model.thalamus = spa.Thalamus(model.bg)

    # Function for providing visual input
    def visual_input(t):
        if 0.1 < t < 0.3:
            return "STATEMENT+RED*CIRCLE"
        elif 0.35 < t < 0.5:
            return "STATEMENT+BLUE*SQUARE"
        elif 0.55 < t < 0.7:
            return "QUESTION+BLUE"
        elif 0.75 < t < 0.9:
            return "QUESTION+CIRCLE"
        return "ZERO"

    # Inputs
    model.input = spa.Input(visual=visual_input)
