import pytest
import nengo
from nengo import spa

from nengo_gui.components.spa_plot import SpaPlot

def test_applicable_targets():
    # Only return non-scalar targets
    model = spa.SPA()

    with model:
        model.comp = spa.Compare(4)
        assert SpaPlot.applicable_targets(model.comp) == []

        model.state = spa.State(4)
        res = SpaPlot.applicable_targets(model.state)
        assert res == list(model.state.outputs.keys())
