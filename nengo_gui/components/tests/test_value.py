import json

import nengo
import numpy as np

from nengo_gui.components import Value


def test_create(client):
    with nengo.Network():
        e = nengo.Ensemble(10, 1)

    value = Value(client, e, "value")

    value.create()
    assert json.loads(client.ws.text) == ["netgraph.create_value", {
        "label": None, "n_lines": 1, "uid": "value",
    }]


def test_add_remove(client, fast_client):
    with nengo.Network() as net:
        e = nengo.Ensemble(5, 1)

    value = Value(client, e, "value")
    value.attach(fast_client)
    value.add_nengo_objects(net)
    assert value.node is not None and value.conn is not None
    assert fast_client.ws.binary is None

    value.node.output(0.0, np.array([0.1]))
    assert fast_client.ws.binary == np.array([0.0, 0.1]).tobytes()
    value.node.output(0.01, np.array([-0.1]))
    assert fast_client.ws.binary == np.array([0.01, -0.1]).tobytes()

    value.remove_nengo_objects(net)
    assert len(net.nodes) == 0
    assert len(net.connections) == 0
    assert value.conn is None
    assert value.node is None
