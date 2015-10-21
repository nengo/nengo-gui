import pytest
import nengo
from nengo import spa

from nengo_gui.components.pointer import Pointer

def test_applicable_targets():
    # Only return non-scalar targets
    model = spa.SPA()

    with model:
        model.comp = spa.Compare(4)
        assert Pointer.applicable_targets(model.comp) == []

        model.state = spa.State(4)
        res = Pointer.applicable_targets(model.state)
        assert res == list(model.state.outputs.keys())
