# Tutorial 25: Parsing Simple Commands

# In this tutorial, we use both the ability to combine structured information
# and the ability to make complex actions to implement a simple two-word
# parsing system.  This model has a single visual input (vision) and you can
# present to it two-word commands.  For example, you can say WRITE followed
# by HI.  It will remember the two terms, store them, and then respond
# appropriately by sending HI to its hand.  It can also SAY BYE, where the
# vector for BYE will be set to the speech system.

# The parsing process is implemented with the first two actions.  The first
# action looks for verbs (WRITE or SAY) and sends them into the memory for
# verbs. The second action looks for nouns (YES or NO or HI or BYE or OK) and
# sends them to the memory for nouns.  The noun stored in the noun memory binds
# with the semantic pointer NOUN and the verb stored in the verb memory binds
# with the semantic pointer VERB in the phrase state.  This binding is
# implemented with cortical actions. Notice that the actions can look for
# multiple different things at the same time by using the + operation.
# Overall, this shows how we can use a single input modality (vision) and treat
# the information in different ways as appropriate.

# The last two actions deal with recognizing and executing actions.  The
# first one looks for the VERB WRITE, and if it sees this it will take
# whatever is in phrase, extract out the NOUN, and send that to the hand.
# Furthermore, it will only do this if it doesn't currently see anything in
# vision (via the subtraction).  This is to make sure it waits until it is
# getting no more visual input before responding.

# To test the model, try presenting WRITE to the vision State.  The phrase
# should fill with WRITE*VERB.  Now change the vision input to HI.  The phrase
# should now fill with NOUN*HI.  If you get rid of the visual input (by setting
# the value to nothing), it shuold sent HI to the hand.  If you try the same
# thing with SAY it should send the result to speech.

import nengo
import nengo.spa as spa

D = 32  # the dimensionality of the vectors

model = spa.SPA()
with model:
    # perceptual input
    model.vision = spa.State(D)

    # linguistic components
    model.phrase = spa.State(D)
    model.verb = spa.State(D, feedback=1)
    model.noun = spa.State(D, feedback=1)

    # motor components
    model.speech = spa.State(D)
    model.hand = spa.State(D)

    actions = spa.Actions(
        "dot(vision, WRITE+SAY) --> verb=vision",
        "dot(vision, YES+NO+HI+BYE+OK) --> noun=vision",
        "dot(phrase, VERB*WRITE) - 2*dot(vision, WRITE+SAY+YES+NO+HI+BYE+OK)"
        "--> hand=phrase*~NOUN",
        "dot(phrase, VERB*SAY) - 2*dot(vision, WRITE+SAY+YES+NO+HI+BYE+OK)"
        "--> speech=phrase*~NOUN",
    )

    model.bg = spa.BasalGanglia(actions)
    model.thalamus = spa.Thalamus(model.bg)

    cortical_actions = spa.Actions("phrase = verb*VERB + noun*NOUN")

    model.cortical = spa.Cortical(cortical_actions)
