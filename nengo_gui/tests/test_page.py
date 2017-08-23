class TestClientConnection(object):

    def test_bind_dispatch(self, client):
        count = [0]

        @client.bind("inc")
        def inc(amount=1):
            count[0] += amount
        assert not client.is_bound("test")
        assert client.is_bound("inc")

        assert count[0] == 0
        client.dispatch("inc")
        assert count[0] == 1
        client.dispatch("inc", amount=4)
        assert count[0] == 5

    def test_multiple_dispatch(self, client):
        counts = [0, 0]

        @client.bind("inc")
        def inc0(amount=1):
            counts[0] += amount

        @client.bind("inc")
        def inc1(amount=1):
            counts[1] += amount

        assert counts == [0, 0]
        client.dispatch("inc")
        assert counts == [1, 1]
        client.dispatch("inc", amount=4)
        assert counts == [5, 5]

    def test_send(self, client):
        client.send("inc", amount=1)
        assert client.ws.text == '["inc", {"amount": 1}]'
