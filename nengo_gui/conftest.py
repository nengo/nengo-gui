import pytest

from nengo_gui.client import ClientConnection


@pytest.fixture
def client():
    class MockWebSocket(object):
        def __init__(self):
            self.text = None

        def write_text(self, text):
            self.text = text
    return ClientConnection(MockWebSocket())
