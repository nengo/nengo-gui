import os

import numpy as np
import pytest

import nengo_gui
import nengo

def test_lorenz():
    pyfile = os.path.join(nengo_gui.__path__[0],
                        'examples/tutorial/15-lorenz.py')

    model_objects = {}
    with open(pyfile) as f:
        code = compile(f.read(), pyfile, 'exec')
        exec(code, model_objects)

    with model_objects['model']:
        state_p = nengo.Probe(model_objects['x'], synapse=.01)

    sim = nengo.Simulator(model_objects['model'])
    sim.run(5)

    variance = np.var(sim.data[state_p],axis=0)

    assert all(variance > 40)
