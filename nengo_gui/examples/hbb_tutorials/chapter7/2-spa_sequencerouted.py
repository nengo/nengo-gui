# Routed Sequencing

# This model introduces routing in the sequencing model. The addition of routing
# allows the system to choose between two different actions: whether to go
# through the sequence, or be driven by the visual input as explained in the
# book. For instance, if the visual input has its value set to 0.8*START+D, the
# model will begin cycling through at D->E, etc. Thus in this model, the input
# doesn't prevent the activation of the second rule in the sequence.

# The parameters used in the model are as described in the book, with 16
# dimensions for all semantic pointers.

# In Nengo 1.4, a buffer element for representing the vision was created by
# using Buffer() as described in the book. However, in Nengo 2.0, you will have
# to use State() with feedback parameter set to 0 (which is the default value in
# nengo).

# Press the play button in the visualizer to run the simulation.
# The graph on the bottom-left shows the visual input recieved by the model,
# the state graph in the middle shows the semantic pointer representation of the
# values stored in the state ensemble. The actions graph on bottom-right shows
# the current transition or the action being executed, and the state graph on
# top-right shows the utility (similarity) of the current basal ganglia input
# (i.e., state) with the possible vocabulary vectors.

# You can see that in this model, even though the input is applied for 400ms, it
# doesn't prevent the activation of the second and subsequent rules in the
# sequence.

# Setup the environment
import nengo
from nengo import spa  # import spa related packages

# Number of dimensions for the semantic pointers
dim = 16

# Create the spa.SPA network to which we can add SPA objects
model = spa.SPA(label="Routed_Sequence", seed=20)
with model:
    # Specify the modules to be used
    model.state = spa.State(dimensions=dim, feedback=1, feedback_synapse=0.01)
    model.vision = spa.State(dimensions=dim)

    # Specify the action mapping
    actions = spa.Actions(
        "dot(vision, START) --> state = vision",
        "dot(state, A) --> state = B",
        "dot(state, B) --> state = C",
        "dot(state, C) --> state = D",
        "dot(state, D) --> state = E",
        "dot(state, E) --> state = A",
    )

    # Creating the BG and thalamus components that confirm to the specified rules
    model.bg = spa.BasalGanglia(actions=actions)
    model.thal = spa.Thalamus(model.bg)

    # Function that provides the model with an initial input semantic pointer.
    def start(t):
        if t < 0.4:
            return "0.8*START+D"
        return "0"

    # Input
    model.input = spa.Input(vision=start)
