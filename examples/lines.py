import numpy as np

import nengo

import nengo_viz

D = 9
cols = int(np.sqrt(D))
size = 150

model = nengo.Network()
with model:
    for i in range(D):
        def waves(t, i=i):
            return np.sin(t + np.arange(i + 1) * 2 * np.pi / (i + 1))
        node = nengo.Node(waves)

viz = nengo_viz.Viz(model, locals=locals(), filename=__file__)
for i in range(D):
    viz.value(model.nodes[i],
              x=(i % cols) * size, y=(i / cols) * size,
              width = size-5, height=size-5)

viz.start()
