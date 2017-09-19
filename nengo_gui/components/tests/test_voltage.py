import json

import nengo
import numpy as np

from nengo_gui.components import Ensemble, Voltage


# TODO: test the horrible hack

def test_create(client):
    with nengo.Network():
        e = nengo.Ensemble(10, 1)

    voltage = Voltage(client, Ensemble(client, e, "e"), "voltage")
    voltage.create()
    # Note: n_neurons defaults to 5
    assert json.loads(client.ws.text) == ["netgraph.create_voltage", {
        "n_neurons": 5, "label": None, "synapse": 0, "uid": "voltage",
    }]


def test_add_remove(client, fast_client):
    with nengo.Network() as net:
        e = nengo.Ensemble(10, 1)

    voltage = Voltage(client, Ensemble(client, e, "e"), "voltage")
    voltage.add_nengo_objects(net)
    assert voltage.probe is not None

    voltage.remove_nengo_objects(net)
    assert len(net.probes) == 0
    assert voltage.probe is None
