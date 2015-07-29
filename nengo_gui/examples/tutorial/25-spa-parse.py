# Tutorial 25: Parsing Simple Commands

# In this tutorial, we use both the ability to combine structured information
# and the ability to make complex actions to implement a simple two-word
# parsing system.  This model has a single visual input (vision) and you can
# present to it two-word commands.  For example, you can say WRITE followed
# by B.  It will remember the two terms, store them, and then respond
# appropriately by sending B to its hand.  It can also SAY D, where the vector
# for D will be set to the speech system.

# The parsing process is implemented with the first two actions.  The first
# action looks for verbs (WRITE or SAY) and sends them into the memory system
# while binding them with VERB at the same time.  The second action looks for
# nouns (A or B or C or D or E) and sends them to the memory while binding
# them with NOUN.  Notice that the actions can looks for multiple different
# things at the same time by using the + operation.  Overall, this shows how
# we can use a single input modality (vision) and treat the information
# in different ways as appropriate.
#
# The last two actions deal with recognizing and executing actions.  The
# first one looks for the VERB WRITE, and if it sees this it will take
# whatever is in memory, extract out the NOUN, and send that to the hand.
# Furthermore, it will only do this if it doesn't currently see anything in
# vision (via the subtraction).  This is to make sure it waits until it is
# getting no more visual input before responding.

# To test the model, try presenting WRITE to the vision Buffer.  The memory
# should fill with WRITE*VERB.  Now change the vision input to B.  The memory
# should now fill with NOUN*B.  If you get rid of the visual input (by setting
# the value to nothing), it shuold sent B to the hand.  If you try the same
# thing with SAY it should send the result to speech.

import nengo
import nengo.spa as spa

D = 32  # the dimensionality of the vectors

model = spa.SPA()
with model:
    model.vision = spa.Buffer(D)
    
    model.memory = spa.Memory(D, synapse=0.2)
    model.speech = spa.Buffer(D)
    model.hand = spa.Buffer(D)

    actions = spa.Actions(
        'dot(vision, WRITE+SAY) --> memory=vision*VERB',
        'dot(vision, A+B+C+D+E) --> memory=vision*NOUN',
        'dot(memory, VERB*WRITE) - dot(vision, WRITE+SAY+A+B+C+D+E)'
            '--> hand=memory*~NOUN',
        'dot(memory, VERB*SAY) - dot(vision, WRITE+SAY+A+B+C+D+E)'
            '--> speech=memory*~NOUN',
        )
        
    model.bg = spa.BasalGanglia(actions)
    model.thalamus = spa.Thalamus(model.bg)