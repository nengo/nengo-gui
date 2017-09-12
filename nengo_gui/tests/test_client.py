import pytest

from nengo_gui.client import bind, ExposedToClient


class TestBindDecorator(object):

    def test_bind_staticmethod(self, client):

        class Test(ExposedToClient):
            n_calls = 0

            @staticmethod
            @bind("test")
            def test1():
                Test.n_calls += 1

            @staticmethod
            @bind("test")
            def test2():
                Test.n_calls += 1

        test = Test(client)
        assert test and Test.n_calls == 0
        client.dispatch("test")
        assert Test.n_calls == 2

    def test_bind_classmethod(self, client):

        class Test(ExposedToClient):
            n_calls = 0

            @classmethod
            @bind("test")
            def test1(cls):
                cls.n_calls += 1

            @bind("test")
            @classmethod
            def test2(cls):
                cls.n_calls += 1

        test = Test(client)
        assert test and Test.n_calls == 0
        client.dispatch("test")
        assert Test.n_calls == 2

    def test_bind_method(self, client):

        class Test(ExposedToClient):
            @bind("test")
            def test(self):
                self.called = True

        test = Test(client)
        assert not hasattr(test, "called")
        client.dispatch("test")
        assert test.called

    def test_bind_property_ok(self, client):

        class Test(ExposedToClient):
            @property
            @bind("test")
            def test(self):
                return "test"

        test = Test(client)
        assert test
        assert client.dispatch("test") == "test"

    def test_bind_property_bad(self, client):

        with pytest.raises(RuntimeError):

            # This must fail because when binding to the property, we can't
            # tell if we're trying to bind the getter, setter, or deleter.
            class Test(ExposedToClient):
                @bind("test")
                @property
                def test(self):
                    return "test"

    def _test_autoprune(self, client, Test):
        t = Test(client)
        assert client.is_bound("test")
        del t
        with pytest.warns(UserWarning):
            client.dispatch("test")
        assert not client.is_bound("test")

    def test_autoprune_method(self, client):

        class Test(ExposedToClient):
            @bind("test")
            def test_method(self):
                pass
        self._test_autoprune(client, Test)

    @pytest.mark.xfail(reason="Not implemented yet")
    def test_autoprune_staticmethod(self, client):

        class Test(ExposedToClient):
            @staticmethod
            @bind("test")
            def test_staticmethod():
                pass
        self._test_autoprune(client, Test)

    @pytest.mark.xfail(reason="Not implemented yet")
    def test_autoprune_classmethod(self, client):

        class Test(ExposedToClient):
            @classmethod
            @bind("test")
            def test_classmethod(cls):
                pass
        self._test_autoprune(client, Test)

    @pytest.mark.xfail(reason="Not implemented yet")
    def test_autoprune_property(self, client):

        class Test(ExposedToClient):
            @property
            @bind("test.get")
            def test(self):
                pass
        self._test_autoprune(client, Test)


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
