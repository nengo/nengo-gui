import json

import nengo
import numpy as np

from nengo_gui.components import Ensemble, SpikeGrid


def test_create(client):
    with nengo.Network():
        e = nengo.Ensemble(10, 1)

    grid = SpikeGrid(client, Ensemble(client, e, "e"), "grid")
    grid.create()
    assert json.loads(client.ws.text) == ["netgraph.create_spike_grid", {
        "label": None, "pixels_x": 4, "pixels_y": 3,
    }]


def test_add_remove(client, fast_client):
    with nengo.Network() as net:
        e = nengo.Ensemble(5, 1)

    grid = SpikeGrid(client, Ensemble(client, e, "e"), "grid", n_neurons=10)
    grid.attach(fast_client)
    grid.add_nengo_objects(net)
    assert grid.node is not None and grid.conn is not None
    assert fast_client.ws.binary is None

    grid.node.output(0.0, np.array([0, 1, 0, 1, 0]))
    assert (fast_client.ws.binary ==
            np.array([0, 255, 0, 255, 0], dtype=np.uint8).tobytes())

    grid.node.output(0.01, np.array([0, 0, 0.5, 0, 0.5]))
    assert (fast_client.ws.binary ==
            np.array([0, 0, 127, 0, 127], dtype=np.uint8).tobytes())

    grid.remove_nengo_objects(net)
    assert len(net.nodes) == 0
    assert len(net.connections) == 0
    assert grid.conn is None
    assert grid.node is None
