import pytest

from nengo_gui.client import ClientConnection, FastClientConnection


class MockWebSocket(object):
    def __init__(self):
        self.binary = None
        self.text = None

    def write_binary(self, binary):
        self.binary = binary

    def write_text(self, text):
        self.text = text


@pytest.fixture
def client():
    return ClientConnection(MockWebSocket())


@pytest.fixture
def fast_client():
    return FastClientConnection(MockWebSocket())
