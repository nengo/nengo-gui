# Tutorial 23: Binding Concepts

import nengo
import nengo.spa as spa

D = 32  # the dimensionality of the vectors

model = spa.SPA()
with model:
    model.color = spa.Buffer(D)
    model.shape = spa.Buffer(D)
    model.memory = spa.Memory(D, synapse=0.1)

    actions = spa.Actions(
        'memory = color * shape * 0.4',
        )
        
    model.cortical = spa.Cortical(actions)

        