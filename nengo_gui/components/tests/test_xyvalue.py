import json

import nengo
import numpy as np

from nengo_gui.components import Ensemble, XYValue


def test_create(client):
    with nengo.Network():
        e = nengo.Ensemble(10, 2)

    xyvalue = XYValue(client, Ensemble(client, e, "e"), "xyvalue")

    xyvalue.create()
    assert json.loads(client.ws.text) == ["netgraph.create_xyvalue", {
        "label": None, "n_lines": 2, "uid": "xyvalue",
    }]


def test_add_remove(client, fast_client):
    with nengo.Network() as net:
        e = nengo.Ensemble(5, 2)

    xyvalue = XYValue(client, Ensemble(client, e, "e"), "xyvalue")
    xyvalue.attach(fast_client)
    xyvalue.add_nengo_objects(net)
    assert xyvalue.node is not None and xyvalue.conn is not None
    assert fast_client.ws.binary is None

    xyvalue.node.output(0.0, np.array([0.1, 0.2]))
    assert fast_client.ws.binary == np.array([0.0, 0.1, 0.2]).tobytes()
    xyvalue.node.output(0.01, np.array([-0.1, -0.2]))
    assert fast_client.ws.binary == np.array([0.01, -0.1, -0.2]).tobytes()

    xyvalue.remove_nengo_objects(net)
    assert len(net.nodes) == 0
    assert len(net.connections) == 0
    assert xyvalue.conn is None
    assert xyvalue.node is None
