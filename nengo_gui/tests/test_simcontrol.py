import time

import pytest

from nengo_gui.simcontrol import SimRunner


@pytest.yield_fixture
def runner():
    class MockSimulator(object):
        def __init__(self):
            self.step_calls = 0
            self.run_steps_calls = 0
            self.n_steps = 0

        def run_steps(self, n_steps):
            self.n_steps = n_steps
            self.run_steps_calls += 1

        def step(self):
            self.step_calls += 1

    r = SimRunner(MockSimulator())
    yield r
    r.stop()
    r.join()


class TestSimRunner(object):

    def test_max_steps(self, runner):
        runner.sim.max_steps = 5

        runner.start()
        time.sleep(0.01)
        runner.pause()
        time.sleep(0.01)
        assert runner.sim.step_calls == 0
        assert runner.sim.run_steps_calls > 0
        assert runner.sim.n_steps == 5
