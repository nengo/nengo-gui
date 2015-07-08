# Tutorial 24: Unbinding Concepts

import nengo
import nengo.spa as spa

D = 32  # the dimensionality of the vectors

model = spa.SPA()
with model:
    model.color = spa.Buffer(D)
    model.shape = spa.Buffer(D)
    model.memory = spa.Memory(D, synapse=0.1)
    model.query = spa.Buffer(D)
    model.answer = spa.Buffer(D)

    actions = spa.Actions(
        'memory = color * shape * 0.4',
        'answer = memory * ~query * 2',
        )
        
    model.cortical = spa.Cortical(actions)

        