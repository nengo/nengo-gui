import json

import nengo

from nengo_gui.components import HTMLView, Node


def test_create(client):
    with nengo.Network():
        n = nengo.Node(None)

    html = HTMLView(client, Node(client, n, "n"), "htmlview")
    html.create()
    assert json.loads(client.ws.text) == ["netgraph.create_htmlview", {
        "label": None, "uid": "htmlview",
    }]


def test_add_remove(client):

    f = lambda t: 0.0
    f._nengo_html_ = "test"
    with nengo.Network() as net:
        n = nengo.Node(output=f)

    html = HTMLView(client, Node(client, n, "n"), "htmlview")
    html.add_nengo_objects(net)
    assert n.output is not f
    assert html._old_output is f
    assert client.ws.text is None

    n.output(0.0)
    assert json.loads(client.ws.text) == ["htmlview.html", {
        "t": 0.0, "html": "test",
    }]

    html.remove_nengo_objects(net)
    assert n.output is f
    assert html._old_output is None
