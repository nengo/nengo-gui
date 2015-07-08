# Tutorial 25: Parsing Simple Commands

import nengo
import nengo.spa as spa

D = 32  # the dimensionality of the vectors

model = spa.SPA()
with model:
    model.vision = spa.Buffer(D)
    
    model.memory = spa.Memory(D, synapse=0.1)
    model.speech = spa.Buffer(D)
    model.hand = spa.Buffer(D)

    actions = spa.Actions(
        'dot(vision, WRITE+SAY) --> memory=vision*VERB*0.4',
        'dot(vision, A+B+C+D+E) --> memory=vision*NOUN*0.4',
        'dot(memory, VERB*WRITE) - dot(vision, WRITE+SAY+A+B+C+D+E)'
            '--> hand=memory*~NOUN',
        'dot(memory, VERB*SAY) - dot(vision, WRITE+SAY+A+B+C+D+E)'
            '--> speech=memory*~NOUN',
        )
        
    model.bg = spa.BasalGanglia(actions)
    model.thalamus = spa.Thalamus(model.bg)