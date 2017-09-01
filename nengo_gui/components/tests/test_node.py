import nengo

from nengo_gui.components import Node


def test_similar(client):
    with nengo.Network():
        node1 = nengo.Node(None, size_in=1)
        node2 = nengo.Node(None, size_in=1)

    # Note: uids must be the same
    n1 = Node(client, node1, "node")
    n2 = Node(client, node2, "node")

    assert n1.similar(n2) and n2.similar(n1)

    node1.size_out = 2
    assert not n1.similar(n2) and not n2.similar(n1)

    node1.size_out = 1
    assert n1.similar(n2) and n2.similar(n1)
    node2.output = lambda t: t
    assert not n1.similar(n2) and not n2.similar(n1)

    node1.output = lambda t: t
    assert n1.similar(n2) and n2.similar(n1)
    node1.output._nengo_html_ = None
    assert not n1.similar(n2) and not n2.similar(n1)
