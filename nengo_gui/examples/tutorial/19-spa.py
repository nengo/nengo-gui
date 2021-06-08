# Tutorial 19: Semantic Pointers

# If we want to represent conceptual information, we need a way to represent
# concepts and symbol-like manipulations using Nengo.  We do this by treating
# concepts like vectors: high-dimensional numerical data.  That is, each
# concept (like DOG or CAT or VERB or RUNNING) corresponds to a particular
# vector.  So HOUSE might be [0.2, 0.6, -0.7, -0.2, 0] and DREAM might be
# [-0.1, -0.7, 0, 0.9, 0.2].
#
# We call these "semantic" because, in general, we would choose these
# numerical values such that concepts with similar semantics (like DOG and
# CAT) might have similar numerical values.

# To help work with these vectors, we introduce a new collection of pre-built
# Networks, and a new type of graph.  The new pre-built Networks can be
# accessed via nengo.spa ("spa" stands for "Semantic Pointer Architecture",
# a collection of tools for making these sorts of models.  A spa.State is
# a Network that holds one vector representing a semantic pointer.
# If the feedback parameter is set, then the spa.State acts like a memory,
# remembering the vector even after the input has been taken away.
#
# The new graph is a "Semantic pointer" graph.  Rather than showing the
# individual values, it shows how close the currently represented vector is
# to the ideal original vectors.  Furthermore, you can use it as an input
# system as well, and define new concepts.

# Press play to start the simulation running.  Now right-click on the "vision"
# graph (the blank space above the "vision" box in the diagram).  Select "Set
# value..." and put in CAT as a value.  Nengo will randomly generate a new
# vector to mean CAT and will feed it into the model.  Since the vision system
# is connected to the memory system, the memory will gradually store CAT as
# well.  Now right-click on vision, go to "Set value" and just leave it blank
# (click OK).  The CAT in vision will go away, but the memory should continue
# to store CAT.  Now set the vision to DOG.  This new vector will be fed into
# the memory, gradually replacing the CAT.  (The size and darkness of the words
# indicates how similar the vector is to the ideal vectors for CAT and DOG).

import nengo
import nengo.spa as spa

D = 32  # the dimensionality of the vectors

model = spa.SPA()
with model:
    model.vision = spa.State(D)

    model.memory = spa.State(D, feedback=1)

    nengo.Connection(model.vision.output, model.memory.input, transform=0.1)
