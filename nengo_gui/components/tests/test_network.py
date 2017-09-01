import nengo

from nengo_gui.components import Network


def test_similar(client):
    with nengo.Network() as net1:
        net2 = nengo.Network()

    # Note: uids must be the same
    n1 = Network(client, net1, "node")
    n2 = Network(client, net2, "node")

    assert n1.similar(n2) and n2.similar(n1)

    with net2:
        net2.output = nengo.Ensemble(10, 1)
    assert not n1.similar(n2) and not n2.similar(n1)
