# Sequencing

# This model uses the basal ganglia model to cycle through a sequence of five
# states (i.e., A->B->C->D->E->A->...). The model incorporates a
# working memory component (state), which allows the basal ganglia to update
# that memory based on a set of condition/action mappings.

# The model has parameters as described in the book. In Nengo 1.4 (and the book)
# separate 'Rules' and 'Sequence' classes were created. However, this is not
# needed in Nengo 2.0 since you can directly specify the rules using the
# built-in 'Actions' class in the spa (semantic pointer architecutre) package. This
# class takes a string definition of the action as an input as shown in the code
# where '-->' is used to split the action into condition and effect, otherwise
# it is treated as having no condition and just effect.

# The syntax for creating an input function in Nengo 2.0 is also different from
# that in Nengo 1.4 mentioned in the book. The syntax for Nengo 2.0 which is
# used here is spa.input(module=function). The first parameter 'module'
# refers to name of the module that you want to provide input to and the second
# parameter 'function' refers to the function to execute to generate inupts to
# that module. The functions should always return strings, which will then be
# parsed by the relevant vocabulary.

# In Nengo 1.4, a memory element for representing the state was created by using
# Buffer() as described in the book. However, in Nengo 2.0, we use
# State() with feedback parameter set to 1 for creating a memory module capable
# of storing a vector over time.

# Press the play button in the visualizer to run the simulation.
# The graph on the top-left shows the semantic pointer representation of the
# values stored in the state ensemble. The graph on the bottom-right shows the
# current transition or the action being executed, and the graph on the
# top-right shows the utility (similarity) of the current basal ganglia input
# (i.e., state) with the possible vocabulary vectors.

# The book describes that the results of the model can be seen through the
# visualizer in Nengo 1.4 GUI which has a "Utility" box and the "Rules" box.
# Note that the bottom-right graph shows the same information as seen in the
# "Rules" box and top-right graph shows the same information as seen in the
# "Utility" box.

# Setup the environment
import nengo
from nengo import spa  # import spa related packages

# Number of dimensions for the Semantic Pointers
dim = 16

# Create the spa.SPA network to which we can add SPA objects
model = spa.SPA(label="Sequence")
with model:
    # Creating a working memory/cortical element
    model.state = spa.State(dimensions=dim, feedback=1, feedback_synapse=0.01)

    # Specifying the action mappings (rules) for BG and Thal
    actions = spa.Actions(
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
        if t < 0.1:  # Duration of the initial input = 0.1
            return "D"
        return "0"

    # Input
    model.input = spa.Input(state=start)
