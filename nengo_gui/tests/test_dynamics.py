import os

import nengo
import numpy as np

import nengo_gui


def test_lorenz():
    pyfile = os.path.join(
        nengo_gui.__path__[0], 'examples', 'tutorial', '15-lorenz.py')

    model_objects = {}
    nengo.utils.stdlib.execfile(pyfile, model_objects)

    with model_objects['model']:
        state_p = nengo.Probe(model_objects['x'], synapse=.01)

    with nengo.Simulator(model_objects['model']) as sim:
        sim.run(5)

    variance = np.var(sim.data[state_p], axis=0)
    assert np.all(variance > 40)
