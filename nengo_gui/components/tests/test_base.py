import pytest

from nengo_gui.components.base import Component, Position, Widget
from nengo_gui.exceptions import NotAttachedError


class TestPosition(object):

    def test_defaults(self):
        pos = Position()
        assert pos.x == 0
        assert pos.y == 0
        assert pos.width == 100
        assert pos.height == 100

    def test_repr(self):
        pos = Position()
        assert repr(pos) == "Position(x=0, y=0, width=100, height=100)"


class TestComponent(object):

    def test_uid_readonly(self, client):
        comp = Component(client, None, "comp")
        assert comp.uid == "comp"
        with pytest.raises(AttributeError):
            comp.uid = "comp"

    def test_similar(self, client):
        c1 = Component(client, None, "c1")
        c2 = Component(client, None, "c2")
        assert not c1.similar(c2) and not c2.similar(c1)
        c2._uid = "c1"
        assert c1.similar(c2) and c2.similar(c1)

    def test_update(self, client):
        c1 = Component(client, None, "comp")
        c2 = Component(client, None, "comp")
        c1.update(c2)
        assert client.ws.text is None  # No update
        c1.label = "comp"
        c1.update(c2)
        assert client.ws.text == '["comp.label", {"label": "comp"}]'
        c2.update(c1)
        assert client.ws.text == '["comp.label", {"label": null}]'

    def test_must_implement(self, client):
        comp = Component(client, None, "comp")

        with pytest.raises(NotImplementedError):
            comp.create()
        with pytest.raises(NotImplementedError):
            comp.delete()


class TestWidget(object):

    def test_fast_client(self, client):
        widget = Widget(client, None, "widget")

        # For other nonexistent attributes
        with pytest.raises(AttributeError):
            widget.test

        # For fast_client
        with pytest.raises(NotAttachedError):
            widget.fast_client

        widget.attach(None)
        assert widget.fast_client is None
