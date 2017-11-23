import importlib
import time
import timeit
import traceback

import nengo
import numpy as np

from nengo_gui import exec_env
from nengo_gui.client import bind, ExposedToClient
from nengo_gui.threads import ControlledThread


class SimControl(ExposedToClient):
    """Controls the simulation.

    Also instantiates and communicates with the SimControl and the Toolbar
    on the JavaScript side, which includes the task of back-end selection.
    """

    RATE_TAU = 0.5

    # TODO: shown_time=0.5, kept_time=4.0,
    def __init__(self, client, dt=0.001, backend="nengo"):
        super(SimControl, self).__init__(client)
        self._dt = dt
        # self.shown_time = shown_time
        # self.kept_time = kept_time
        self.backend = backend

        self.node = None
        self.last_time = None

        self.paused = True
        self.rate = 0.0

        self.skipped = 1
        self.time = 0.0
        self.target_rate = 1.0  # desired speed of simulation
        self.target_scale = None  # desired proportion of full speed
        self.delay_time = 0.0  # amount of delay per time step
        self.rate_proportion = 1.0  # current proportion of full speed
        self.sleep_offset = 0.0  # difference from actual sleep time

        # TODO: really need a better way to do this
        self.voltage_comps = []

        self._sim = None
        self.simthread = ControlledThread(self._step)
        self.simthread.pause()
        self.simthread.start()

        # TODO: Make sure this is handled
        # if self.page.changed:
        #     self.paused = True
        #     self.page.sim = None
        #     self.page.changed = False

    @property
    @bind("simcontrol.get_backend")
    def backend(self):
        return self._backend

    @backend.setter
    @bind("simcontrol.set_backend")
    def backend(self, backend):
        self._backend = backend
        # self.client.dispatch("page.rebuild")  # ??? also reset ???

    @property
    @bind("simcontrol.get_dt")
    def dt(self):
        return self._dt

    @property
    def sim(self):
        return self._sim

    @sim.setter
    def sim(self, value):
        self.simthread.pause()
        if self._sim is not None and self._sim is not value:
            self._sim.close()
        self._sim = value

    @property
    def status(self):
        return self._status

    @status.setter
    def status(self, val):
        self._status = val
        self.send_status()

    def add_nengo_objects(self, network):
        with network:
            self.node = nengo.Node(self.control, size_out=0)

    def attach(self, fast_client):
        self.fast_client = fast_client

    def remove_nengo_objects(self, network):
        network.nodes.remove(self.node)

    # TODO: This logic should be part of _step, not something injected
    #       into the simulation. Pausing the thread is already possible,
    #       but only used when changing the simulator. Ideally we'd have the
    #       _step control the throttling as well.
    def control(self, t):
        """Node embedded in the model to control simulation progression.

        Sleeps while the simulation is paused.
        """

        # TODO: this is a hack too far!
        for v in self.voltage_comps:
            # This should happen once per timestep...
            assert len(self._sim.data.raw[v.probe]) == 1

            data = self._sim.data.raw[v.probe][0]
            assert data.shape == (v.n_neurons,)
            del self._sim.data.raw[v.probe][:]  # clear the data
            v.fast_client.send(np.hstack([t, data]))
        # OK hack over

        actual_dt = t - self.time
        self.time = t
        self.fast_client.send(np.array(self.time, dtype=np.float64))

        now = timeit.default_timer()
        if self.last_time is not None:
            dt = now - self.last_time
            if dt == 0:
                self.skipped += 1
            else:
                rate = actual_dt * self.skipped / dt
                decay = np.exp(-dt / self.RATE_TAU)
                self.rate *= decay
                self.rate += (1 - decay) * rate
                self.skipped = 1

                if actual_dt > 0:
                    # compute current proportion of full speed
                    self.rate_proportion = 1.0 - (
                        (self.rate * self.delay_time) / actual_dt)

        # if we have a desired proportion, use it to control delay_time
        #  Note that we need last_time to not be None so that we have a
        #  valid dt value.
        if self.target_scale is not None and self.last_time is not None:
            s = self.target_scale
            if s <= 0:
                self.delay_time = 0.5
            else:
                self.delay_time = (1.0/s - s) * (dt - self.delay_time)

        # if we have a desired rate, do a simple P-controller to get there
        if self.target_rate is not None:
            rate_error = self.rate - self.target_rate
            delta = rate_error * 0.0000002
            self.delay_time += delta

        self.delay_time = np.clip(self.delay_time, 0, 0.5)
        if self.delay_time > 0:
            self.sleep(self.delay_time)

        self.last_time = now
        self.send_rate()

        # Sleeps to prevent the simulation from advancing
        # while the simulation is paused
        while self.paused and self._sim is not None:
            time.sleep(0.01)
            self.last_time = None

    def _set_stream(self, name, output, line=None):
        self.client.dispatch("editor.%s" % (name,), output=output, line=line)

    def _step(self):
        try:
            if hasattr(self._sim, 'max_steps'):
                # this is only for the nengo_spinnaker simulation
                self._sim.run_steps(self._sim.max_steps)
            else:
                self._sim.step()
        except Exception as err:
            self.status = 'build_error'
            self._set_stream("stderr", traceback.format_exc())
            self.sim = None

    def build(self, network, filename):
        # Remove the current simulator
        self.sim = None

        # Build the simulation
        Simulator = importlib.import_module(self.backend).Simulator

        sim = None
        env = exec_env.ExecutionEnvironment(filename, allow_sim=True)
        try:
            with env:
                # TODO: make it possible to pass args to the simulator
                sim = Simulator(network, dt=self.dt)
        except Exception:
            self._set_stream("stderr", traceback.format_exc())
        self._set_stream("stdout", env.stdout.getvalue())
        self.sim = sim

    def send_rate(self):
        self.client.send("simcontrol.rate",
                         rate=self.rate,
                         proportion=self.rate_proportion)

    def send_status(self):
        self.client.send("simcontrol.status", status=self.status)

    @bind("simcontrol.pause")
    def pause(self):
        self.paused = True
        self.status = "paused"
        self.simthread.pause()

    @bind("simcontrol.config")
    def config(self):
        self.client.send("simcontrol.config",
                         sims=[exec_env.discover_backends()],
                         current=self.backend)
        # TODO: Move to typescript
        # client.write_text('confignengo.toolbar.config_modal_show();')
        # def backend_options_html(self):
        #     items = []
        #     for module in exec_env.discover_backends():
        #         if module == self.page.settings.backend:
        #             selected = ' selected'
        #         else:
        #             selected = ''
        #         item = '<option %s>%s</option>' % (selected, module)
        #         items.append(item)
        #     return ''.join(items)

    @bind("simcontrol.play")
    def play(self):
        if self._sim is None:
            self.status = 'building'
            self.client.dispatch("page.build")
        self.paused = False
        self.status = "running"
        self.simthread.play()

    @bind("simcontrol.reset")
    def reset(self):
        self.paused = True
        self.simthread.pause()
        self.sim = None
        self.time = 0
        self.rate = 0
        self.rate_proportion = 1.0
        self.send_rate()

    @bind("simcontrol.target_scale")
    def target_scale(self, target):
        self.target_scale = float(target)
        self.target_rate = None

    def sleep(self, delay_time):
        """Attempt to sleep for an amount of time without a busy loop.

        This keeps track of the difference between the requested time.sleep()
        time and the actual amount of time slept, and then subtracts that
        difference from future smart_sleep calls.  This should give an
        overall consistent sleep() time even if the actual sleep() time
        is inaccurate.
        """
        t = delay_time + self.sleep_offset
        if t >= 0:
            start = timeit.default_timer()
            time.sleep(t)
            end = timeit.default_timer()
            self.sleep_offset += delay_time - (end - start)
        else:
            self.sleep_offset += delay_time
