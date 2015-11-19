import pytest
import nengo
from nengo import spa

from nengo_gui.components.value import Value

def test_output_detect():
    model = spa.SPA()

    with model:

        # Find the output for ens
        ens = nengo.Ensemble(10, 2)
        val = Value(ens)
        assert val.n_lines == 2
        assert val.output == ens

        # Find output for node
        node = nengo.Node([0, 0, 0])
        val = Value(node)
        assert val.n_lines == 3
        assert val.output == node

        # Find output for network
        ea = nengo.networks.EnsembleArray(10, 4)
        val = Value(ea)
        assert val.n_lines == 4
        assert val.output == ea.output

        # Find output for SPA module
        model.comp = spa.Compare(4)
        val = Value(model.comp)
        assert val.n_lines == 1
        assert val.output == model.comp.output
