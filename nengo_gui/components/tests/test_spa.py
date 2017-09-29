import json

import nengo.spa
import numpy as np

from nengo_gui.components.spa import SpaPointer, SpaSimilarity, SpaWidget


class TestSpaWidget(object):

    def test_show_pairs(self, client):
        with nengo.spa.SPA() as model:
            model.state = nengo.spa.State(16)

        widget = SpaWidget(client, model.state, "widget")
        widget.vocab.parse("A+B")
        assert not widget.show_pairs
        assert widget.keys == ["A", "B"]
        widget.show_pairs = True
        assert widget.show_pairs
        assert widget.keys == ["A", "B", "A*B"]
        assert client.ws.text == (
            '["widget.set_keys", {"keys": ["A", "B", "A*B"]}]')
        client.dispatch("widget.show_pairs", val=False)
        assert client.ws.text == '["widget.set_keys", {"keys": ["A", "B"]}]'
        assert not widget.show_pairs
        assert widget.keys == ["A", "B"]


class TestSpaPointer(object):

    def test_create(self, client):
        with nengo.spa.SPA() as model:
            model.state = nengo.spa.State(16)

        pointer = SpaPointer(client, model.state, "pointer")
        assert pointer.override is None
        pointer.create()
        assert json.loads(client.ws.text) == [
            "netgraph.create_spa_pointer", {"label": None, "uid": "pointer"}
        ]

    def test_add_remove(self, client):
        with nengo.spa.SPA() as model:
            model.state = nengo.spa.State(16)

        pointer = SpaPointer(client, model.state, "pointer")
        assert pointer.override is None
        pointer.vocab.add("A", np.ones(16))
        pointer.add_nengo_objects(model)

        # No override, input v: return 0, max similarity
        out = pointer.node.output(0.001, np.ones(16))
        assert np.all(out == 0)
        assert client.ws.text == '["pointer.matches", {"data": "9.99A"}]'

        # Override, input 0: return v*3, no similarity
        pointer.override = "A"
        out = pointer.node.output(0.002, np.zeros(16))
        assert np.allclose(out, 3 * np.ones(16))
        assert client.ws.text == '["pointer.matches", {"data": ""}]'

        # Override, input v: return 0, max similarity
        pointer.override = "A"
        out = pointer.node.output(0.003, np.ones(16))
        assert np.allclose(out, 0)
        assert client.ws.text == '["pointer.matches", {"data": "9.99A"}]'

        pointer.remove_nengo_objects(model)
        assert pointer.node is None
        assert pointer.conn1 is None
        assert pointer.conn2 is None


class TestSpaSimilarity(object):

    def test_create(self, client):
        with nengo.spa.SPA() as model:
            model.state = nengo.spa.State(16)

        similarity = SpaSimilarity(client, model.state, "similarity")
        similarity.vocab.parse("A+B+C")
        similarity.create()
        assert json.loads(client.ws.text) == [
            "netgraph.create_spa_similarity", {
                "keys": ["A", "B", "C"],
                "label": None,
                "uid": "similarity",
            }
        ]

    def test_add_remove(self, client, fast_client):
        with nengo.spa.SPA() as model:
            model.state = nengo.spa.State(2)

        similarity = SpaSimilarity(client, model.state, "similarity")
        similarity.attach(fast_client)
        similarity.vocab.add("A", np.ones(2))
        similarity.add_nengo_objects(model)

        assert similarity.node.output(0.001, np.ones(2)) is None
        assert client.ws.text is None
        assert fast_client.ws.binary == np.array([0.001, 2.0]).tobytes()

        similarity.vocab.add("B", np.zeros(2))
        assert similarity.node.output(0.002, np.ones(2)) is None
        assert client.ws.text == (
            '["similarity.reset_legend_and_data", {"keys": ["A", "B"]}]')
        assert fast_client.ws.binary == np.array([0.002, 2.0, 0.0]).tobytes()

        similarity.show_pairs = True
        assert similarity.node.output(0.003, np.ones(2)) is None
        assert client.ws.text == (
            '["similarity.reset_legend_and_data", {"keys": ["A", "B", "A*B"]}]'
        )
        assert (fast_client.ws.binary ==
                np.array([0.003, 2.0, 0.0, 0.0]).tobytes())

        similarity.remove_nengo_objects(model)
        assert similarity.node is None
        assert similarity.conn is None
