import pytest


class TestClientConnection(object):

    def test_bind_dispatch(self, client):
        count = [0]

        def inc(amount=1):
            count[0] += amount
        client.bind("inc", inc)
        assert not client.is_bound("test")
        assert client.is_bound("inc")

        assert count[0] == 0
        client.dispatch("inc")
        assert count[0] == 1
        client.dispatch("inc", amount=4)
        assert count[0] == 5

    def test_multiple_dispatch(self, client):
        counts = [0, 0]

        def inc0(amount=1):
            counts[0] += amount
        client.bind("inc", inc0)

        def inc1(amount=1):
            counts[1] += amount
        client.bind("inc", inc1)

        assert counts == [0, 0]
        client.dispatch("inc")
        assert counts == [1, 1]
        client.dispatch("inc", amount=4)
        assert counts == [5, 5]

    def test_send(self, client):
        client.send("inc", amount=1)
        assert client.ws.text == '["inc", {"amount": 1}]'

    def test_unbind(self, client):
        f1 = lambda: None
        f2 = lambda: "Test"
        assert not client.is_bound("test")
        client.bind("test", f1)
        assert client.is_bound("test")
        client.bind("test", f2)
        assert client.is_bound("test")
        client.unbind("test", f1)
        assert client.is_bound("test")
        client.unbind("test", f2)
        assert not client.is_bound("test")

    def test_autoprune(self, client):
        f1 = lambda: None

        class Test(object):
            def test(self):
                pass

        t = Test()
        client.bind("test", f1)
        client.bind("test", t.test)

        assert client.is_bound("test")
        client.dispatch("test")

        del f1
        del t

        with pytest.warns(UserWarning):
            client.dispatch("test")
        assert not client.is_bound("test")
