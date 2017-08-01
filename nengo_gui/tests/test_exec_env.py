import nengo
import pytest

from nengo_gui import exec_env


def test_disallow_sim():
    with nengo.Network() as net:
        nengo.Ensemble(10, 1)

    with exec_env.ExecutionEnvironment(None, allow_sim=False) as env:
        assert exec_env.flag.executing
        assert env.directory is None
        assert not env.allow_sim

        with pytest.raises(exec_env.StartedSimulatorException):
            with nengo.Simulator(net):
                pass

    assert not exec_env.flag.executing
