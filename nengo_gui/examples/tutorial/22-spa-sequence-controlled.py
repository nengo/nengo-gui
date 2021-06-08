# Tutorial 22: Controlled Sequence of Semantic Pointer Actions

# Here, we expand on the previous sequence example and define a model
# that instead of starting from A each time, starts from whatever value
# is currently seen.  This shows that you can selectively route information
# from one group of neurons to another, depending on what action is
# selected.
#
# Try setting vision to A (using "Set value" on the vision graph).  The
# memory should go through the sequence (A, B, C, D, E) and repeat.  Now
# set vision to C.  It should do (C, D, E) and repeat.
#
# Note that it takes slightly longer for the model to transfer information
# from vision to memory than it does to just go to the next item in the
# sequence.  This is due to the time needed for the neurons to respond,
# and is consistent with psychological reaction time data.

import nengo
import nengo.spa as spa

D = 32  # the dimensionality of the vectors

model = spa.SPA()
with model:
    model.vision = spa.State(D)
    model.memory = spa.State(D, feedback=1, feedback_synapse=0.01)

    actions = spa.Actions(
        "dot(memory, A) --> memory=B",
        "dot(memory, B) --> memory=C",
        "dot(memory, C) --> memory=D",
        "dot(memory, D) --> memory=E",
        "dot(memory, E) --> memory=vision",
        "0.5 --> memory=vision",
    )

    model.bg = spa.BasalGanglia(actions)
    model.thalamus = spa.Thalamus(model.bg)
