# Tutorial 21: Sequential Semantic Pointer Actions

# In this example, we define a set of actions that follow through a
# repeating sequence (A, B, C, D, E).  This shows that you can define
# actions which affect the performance of later actions.

# In this example we have changed the default value of the optional argument
# feedback_synapse, which is the time constant controlling the exponential
# decay of the postsynaptic potential. Try using longer time constants
# (e.g. 0.1 or 0.5) and observe what changes. How is the stability of
# a memory representation related to the synaptic time constant?

import nengo
import nengo.spa as spa

D = 32  # the dimensionality of the vectors

model = spa.SPA()
with model:
    model.memory = spa.State(D, feedback=1, feedback_synapse=0.01)

    actions = spa.Actions(
        "dot(memory, A) --> memory=B",
        "dot(memory, B) --> memory=C",
        "dot(memory, C) --> memory=D",
        "dot(memory, D) --> memory=E",
        "dot(memory, E) --> memory=A",
    )

    model.bg = spa.BasalGanglia(actions)
    model.thalamus = spa.Thalamus(model.bg)
