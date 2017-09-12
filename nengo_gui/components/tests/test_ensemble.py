import nengo

from nengo_gui.components import Ensemble


def test_create(client):
    with nengo.Network():
        a = nengo.Ensemble(10, 1)

    comp = Ensemble(client, a, "a")
    comp.create()
    assert client.ws.text == '["netgraph.create_ensemble", {}]'


def test_similar(client):
    with nengo.Network():
        a = nengo.Ensemble(10, 1)
        b = nengo.Ensemble(10, 1)

    # Note: uids must be the same
    e1 = Ensemble(client, a, "ens")
    e2 = Ensemble(client, b, "ens")

    assert e1.similar(e2) and e2.similar(e1)

    a.n_neurons = 20
    assert not e1.similar(e2) and not e2.similar(e1)

    a.n_neurons = 10
    b.dimensions = 2
    assert not e1.similar(e2) and not e2.similar(e1)
