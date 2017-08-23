import time
import timeit
import threading
import traceback

import nengo
import numpy as np

from nengo_gui import exec_env
from nengo_gui.exceptions import NotAttachedError, raise_
from nengo_gui.threads import ControlledThread


class SimControl(object):
    """Controls the simulation.

    Also instantiates and communicates with the SimControl and the Toolbar
    on the JavaScript side, which includes the task of back-end selection.
    """

    RATE_TAU = 0.5

    def __init__(self, shown_time=0.5, kept_time=4.0, backend="nengo"):
        self.shown_time = shown_time
        self.kept_time = kept_time
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

        self._sim = None
        self.simthread = ControlledThread(self._step)
        self.simthread.pause()
        self.simthread.start()

        # Defined in `attach`
        self._set_error = lambda: raise_(NotAttachedError())
        self.send_rate = lambda: raise_(NotAttachedError())
        self.send_status = lambda: raise_(NotAttachedError())

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

    def add_nengo_objects(self, network, config):
        with network:
            self.node = nengo.Node(self.control, size_out=0)

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

        actual_dt = t - self.time
        self.time = t

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

    def _step(self):
        try:
            if hasattr(self._sim, 'max_steps'):
                # this is only for the nengo_spinnaker simulation
                self._sim.run_steps(self._sim.max_steps)
            else:
                self._sim.step()
        except Exception as err:
            self.status = 'build_error'
            self._set_error(output=traceback.format_exc(),
                            line=exec_env.determine_line_number())
            self.sim = None

    def attach(self, client):

        def set_error(output, line):
            client.dispatch("error.stderr", output=output, line=line)
        self._set_error = set_error

        def send_rate():
            client.send("simcontrol.rate",
                        time=self.time,
                        rate=self.rate,
                        proportion=self.rate_proportion)
        self.send_rate = send_rate

        def send_status():
            client.send("simcontrol.status", status=self.status)
        self.send_status = send_status

        @client.bind("simcontrol.pause")
        def pause():
            self.paused = True
            self.status = "paused"

        @client.bind("simcontrol.config")
        def config():
            client.send("simcontrol.config",
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

        @client.bind("simcontrol.play")
        def play():
            if self._sim is None:
                self.status = 'building'
                client.dispatch("page.rebuild")  # ???
            self.paused = False
            self.status = "running"

        @client.bind("simcontrol.reset")
        def reset():
            self.paused = True
            self.simthread.pause()
            self.sim = None
            self.time = 0
            self.rate = 0
            self.rate_proportion = 1.0
            self.send_rate()

        @client.bind("simcontrol.backend")
        def set_backend(backend):
            self.backend = backend
            client.dispatch("page.rebuild")  # ??? also reset ???

        @client.bind("simcontrol.target_scale")
        def target_scale(target):
            self.target_scale = float(target)
            self.target_rate = None

        # TODO: Make sure this is handled
        # if self.page.changed:
        #     self.paused = True
        #     self.page.sim = None
        #     self.page.changed = False

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
