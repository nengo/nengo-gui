import json

import nengo

from nengo_gui.components import Connection
from nengo_gui.netgraph import NameFinder


def test_create(client):
    with nengo.Network():
        a = nengo.Ensemble(10, 1)
        b = nengo.Ensemble(10, 1)
        c = nengo.Connection(a, b)

    names = NameFinder()
    names.update(locals())

    comp = Connection(client, c, names[c], names)
    comp.create()

    assert client.ws.text == '["netgraph.create_connection", {}]'


def test_similar_update(client):
    with nengo.Network():
        a = nengo.Ensemble(10, 1)
        b = nengo.Ensemble(10, 1)
        cab = nengo.Connection(a, b)
        cba = nengo.Connection(b, a)

    names = NameFinder()
    names.update(locals())

    # Note: uids must be the same
    c1 = Connection(client, cab, "conn", names)
    c2 = Connection(client, cba, "conn", names)

    assert c1.similar(c2) and c2.similar(c1)

    c1.update(c2)
    assert json.loads(client.ws.text) == ["conn.reconnect", {
        "pre": "a", "post": "b",
    }]

    c2.update(c1)
    assert json.loads(client.ws.text) == ["conn.reconnect", {
        "pre": "b", "post": "a",
    }]

    c1._uid = "notconn"
    assert not c1.similar(c2) and not c2.similar(c1)
