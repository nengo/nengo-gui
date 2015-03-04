import nengo
import nengo.spa as spa

D = 16

model = spa.SPA(seed=1)
with model:
    model.a = spa.Buffer(dimensions=D)
    model.b = spa.Buffer(dimensions=D)
    model.c = spa.Buffer(dimensions=D)
    model.cortical = spa.Cortical(spa.Actions(
        'c = a*b',
        ))

    model.input = spa.Input(
        a = 'A',
        b = (lambda t: 'C*~A' if (t%0.1 < 0.05) else 'D*~A'),
        )

import nengo_viz
viz = nengo_viz.Viz(model)
viz.pointer(model.c)
viz.start()
