import numpy as np

import nengo

import nengo_viz

D = 2
cols = int(np.sqrt(D))
size = 150

model = nengo.Network()
viz = nengo_viz.Viz(model)
with model:
    for i in range(D):
        node = nengo.Node(lambda t, i=i: np.sin(t + np.linspace(0, 1, i+1) * np.pi *2))
        viz.value(node,
                  x=(i % cols) * size, y=(i / cols) * size,
                  width = size-5, height=size-5)

viz.start()
