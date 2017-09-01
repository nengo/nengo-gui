from nengo_gui.components.base import Component, Plot, Widget


class TestComponent(object):

    def test_ordering(self, client):
        c1 = Component(client, "c1", order=1)
        c2 = Component(client, "c2", order=2)
        c2_2 = Component(client, "c2_2", order=2)

        assert c1 < c2
        assert c1 < c2_2
        assert c1 <= c2
        assert c2 > c1
        assert c2 != c1
        assert c2 == c2_2
        assert c2 <= c2_2
        assert c2 >= c2_2
