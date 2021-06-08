"""
Tests for the NetGraph class.
"""

import nengo
import numpy as np
from nengo_gui.components.netgraph import NetGraph


def test_get_pre_post_obj():
    model = nengo.Network()
    with model:
        a = nengo.Ensemble(1, 10)
        b = nengo.Ensemble(1, 10)
        conn = nengo.Connection(a, b)
    assert a == NetGraph.connection_pre_obj(conn)
    assert b == NetGraph.connection_post_obj(conn)
    assert "normal" == NetGraph.connection_kind(conn)


def test_get_pre_post_obj_neurons():
    model = nengo.Network()
    with model:
        a = nengo.Ensemble(1, 10)
        b = nengo.Ensemble(1, 10)
        conn = nengo.Connection(a.neurons, b.neurons)
    assert a == NetGraph.connection_pre_obj(conn)
    assert b == NetGraph.connection_post_obj(conn)
    assert "normal" == NetGraph.connection_kind(conn)


def test_get_pre_post_obj_learning_rule():
    model = nengo.Network()
    with model:
        a = nengo.Ensemble(1, 10)
        b = nengo.Ensemble(1, 10)
        c = nengo.Ensemble(1, 10)
        conn_1 = nengo.Connection(a, b)
        conn_1.learning_rule_type = nengo.PES()
        conn_2 = nengo.Connection(c, conn_1.learning_rule)
    assert a == NetGraph.connection_pre_obj(conn_1)
    assert b == NetGraph.connection_post_obj(conn_1)
    assert "normal" == NetGraph.connection_kind(conn_1)

    assert c == NetGraph.connection_pre_obj(conn_2)
    assert b == NetGraph.connection_post_obj(conn_2)
    assert "modulatory" == NetGraph.connection_kind(conn_2)


def test_connection_inhibitory():
    model = nengo.Network()
    with model:
        a = nengo.Ensemble(1, 10)
        b = nengo.Ensemble(1, 10)
        conn_1 = nengo.Connection(a, b.neurons, transform=1 * np.ones((1, 10)))
        conn_2 = nengo.Connection(a, b.neurons, transform=-1 * np.ones((1, 10)))
        conn_3 = nengo.Connection(
            a,
            b.neurons,
            transform=np.array((0, -1, 0, 0, 0, 0, 0, 0, 0, 0)).reshape((1, 10)),
        )
        conn_4 = nengo.Connection(a, b.neurons, transform=-1 * np.zeros((1, 10)))
    assert "normal" == NetGraph.connection_kind(conn_1)
    assert "inhibitory" == NetGraph.connection_kind(conn_2)
    assert "inhibitory" == NetGraph.connection_kind(conn_3)
    assert "normal" == NetGraph.connection_kind(conn_4)
