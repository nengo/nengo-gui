# Tutorial 20: Semantic Pointer Actions

# A complex cognitive system needs a method to select and perform actions.
# In particular, it is useful to have a model that can do one thing at
# a time, sequentially.  There is significant psychological data indicating
# that people have such a system, providing a serial bottleneck of
# cognition.
#
# In mammals, this system is often identified with the Basal Ganglia.
# We have shown that a Nengo model of the Basal Ganglia acting as
# an action selection network matches well to human data:
# http://compneuro.uwaterloo.ca/files/publications/stewart.2012a.pdf
# "Stewart TC, Bekolay T and Eliasmith C. Learning to select actions with
#  spiking neurons in the basal ganglia. Front. Neurosci. (6)2, 2012."
#
# This model has been built into the Nengo SPA system for use in your
# models.  To use it, for every action you need to define some function
# that computes the utility of the action (how good the action is right
# now) and what the effect of the action should be (what to do when
# the action is chosen).  The Basal Ganglia model will monitor the
# utilities of each action and select the one with the highest value.
#
# The following code defines four actions.  The utilities look like
# this: "dot(vision, DOG)".  This means that the utility of the action
# is the dot product of whatever vector is in the vision State and
# the ideal vector for DOG.  This will be a value near 1 if you see a
# dog, and will be near zero otherwise.  The closer what you see is to
# a dog, the higher the utility.  The effect of the action is simply
# to set the speech State to the vector for BARK ("speech=BARK").
#
# Try running the model.  Use "Set value" on the vision graph to set the
# input to DOG.  The speech output should become BARK.  Try other inputs,
# such as CAT or COW.  You can also try a combination, such as
# RAT+0.5*COW.  The system will (almost always) select a single action
# to perform, and that will be the action with the highest utility at that
# moment.  If there is no input, or the input is not sufficiently similar
# to any of the four animals it knows, then the speech State is set to
# zero ("speech=0").
#
# The input graph above the Basal Ganglia shows the utilities of the
# four actions.  The output graph above the thalamus shows which
# of the four actions are selected.  The thalamus controls the routing of
# information between brain areas, so here it is used to implement the
# effects of the actions defined in the Basal Ganglia.

import nengo
import nengo.spa as spa

D = 32  # the dimensionality of the vectors

model = spa.SPA()
with model:
    model.vision = spa.State(D)

    model.speech = spa.State(D)

    actions = spa.Actions(
        "dot(vision, DOG) --> speech=BARK",
        "dot(vision, CAT) --> speech=MEOW",
        "dot(vision, RAT) --> speech=SQUEAK",
        "dot(vision, COW) --> speech=MOO",
        "0.5 --> speech=0",
    )

    model.bg = spa.BasalGanglia(actions)
    model.thalamus = spa.Thalamus(model.bg)
