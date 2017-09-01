import time

from nengo_gui.simcontrol import SimControl


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


class TestSimControl(object):

    def test_max_steps(self, client):
        simcontrol = SimControl(client)
        simcontrol.sim = MockSimulator()
        assert simcontrol.sim.step_calls == 0
        assert simcontrol.sim.run_steps_calls == 0

        simcontrol.simthread.play()
        time.sleep(0.01)
        simcontrol.simthread.pause()
        assert simcontrol.sim.step_calls > 0

        simcontrol.sim.max_steps = 5
        simcontrol.simthread.play()
        time.sleep(0.01)
        simcontrol.simthread.pause()
        assert simcontrol.sim.run_steps_calls > 0
        simcontrol.simthread.stop()
