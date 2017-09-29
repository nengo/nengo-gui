import json

import nengo
import numpy as np

from nengo_gui.components import Raster


def test_create(client):
    with nengo.Network():
        e = nengo.Ensemble(10, 1)

    raster = Raster(client, e, "raster")
    raster.create()
    assert json.loads(client.ws.text) == ["netgraph.create_raster", {
        "max_neurons": 10, "label": None,
    }]


def test_add_remove(client, fast_client):
    with nengo.Network() as net:
        e = nengo.Ensemble(10, 1)

    raster = Raster(client, e, "raster", n_neurons=10)
    raster.attach(fast_client)
    raster.add_nengo_objects(net)
    assert raster.node is not None and raster.conn is not None
    assert fast_client.ws.binary is None

    # Spike in indices 1 and 3
    raster.node.output(0.0, np.array([0, 1, 0, 1, 0, 0, 0, 0, 0, 0]))
    assert fast_client.ws.binary == np.array([0.0, 1.0, 3.0]).tobytes()

    # Spike in indices 2 and 4
    raster.node.output(0.01, np.array([0, 0, 1, 0, 1, 0, 0, 0, 0, 0]))
    assert fast_client.ws.binary == np.array([0.01, 2.0, 4.0]).tobytes()

    raster.remove_nengo_objects(net)
    assert len(net.nodes) == 0
    assert len(net.connections) == 0
