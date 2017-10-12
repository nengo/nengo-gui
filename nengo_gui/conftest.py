import os
from pkg_resources import resource_filename

import pytest

from nengo_gui.client import ClientConnection, FastClientConnection


class MockWebSocket(object):
    def __init__(self):
        self.binary = None
        self.binary_history = []
        self.text = None
        self.text_history = []

    def write_binary(self, binary):
        self.binary_history.append(binary)
        self.binary = binary

    def write_text(self, text):
        self.text_history.append(text)
        self.text = text


@pytest.fixture
def client():
    return ClientConnection(MockWebSocket())


@pytest.fixture
def fast_client():
    return FastClientConnection(MockWebSocket())


@pytest.fixture
def example():
    return lambda ex: resource_filename("nengo_gui", "examples/%s" % (ex,))


def pytest_generate_tests(metafunc):
    examples = []
    example_dir = resource_filename("nengo_gui", "examples")
    for subdir, _, files in os.walk(example_dir):
        if (os.path.sep + '.') in subdir:
            continue
        examples.extend([
            os.path.join(subdir, f) for f in files if f.endswith(".py")
        ])

    if "all_examples" in metafunc.funcargnames:
        metafunc.parametrize("all_examples", examples)
