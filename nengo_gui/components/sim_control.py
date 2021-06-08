import json
import struct
import time
import timeit

import nengo
import nengo_gui.exec_env
import numpy as np
from nengo_gui.components.component import Component
from nengo_gui.server import WebSocketFrame


class SimControl(Component):
    """Controls simulation via control node embedded in the neural model.

    Also instantiates and communicates with the SimControl and the Toolbar
    on the JavaScript side, which includes the task of back-end selection."""

    config_defaults = dict(shown_time=0.5, kept_time=4.0)

    def __init__(self, dt=0.001):
        # this component must be the very first one defined, so
        # its component_order is the smallest overall
        super(SimControl, self).__init__(component_order=-10)
        self.paused = True
        self.last_tick = None
        self.rate = 0.0
        self.model_dt = dt
        self.rate_tau = 0.5
        self.last_send_rate = None
        self.sim_ticks = 0
        self.skipped = 1
        self.time = 0.0
        self.last_status = None
        self.next_ping_time = None
        self.send_config_options = False
        self.reset_inform = False
        self.node = None
        self.target_rate = 1.0  # desired speed of simulation
        self.target_scale = None  # desired proportion of full speed
        self.delay_time = 0.0  # amount of delay per time step
        self.rate_proportion = 1.0  # current proportion of full speed
        self.smart_sleep_offset = 0.0  # difference from actual sleep time

    def attach(self, page, config, uid):
        super(SimControl, self).attach(page, config, uid)
        self.shown_time = config.shown_time
        self.kept_time = config.kept_time

    def add_nengo_objects(self, page):
        with page.model:
            self.node = nengo.Node(self.control, size_out=0)

    def remove_nengo_objects(self, page):
        page.model.nodes.remove(self.node)

    def finish(self):
        self.page.finish()

    def control(self, t):
        """Node embedded in the model to control simulation progression.

        Sleeps while the simulation is paused.
        """

        self.actual_model_dt = t - self.time
        self.time = t
        self.sim_ticks += 1

        now = timeit.default_timer()
        if self.last_tick is not None:
            dt = now - self.last_tick
            if dt == 0:
                self.skipped += 1
            else:
                rate = self.actual_model_dt * self.skipped / dt
                decay = np.exp(-dt / self.rate_tau)
                self.rate *= decay
                self.rate += (1 - decay) * rate
                self.skipped = 1

                if self.actual_model_dt > 0:
                    # compute current proportion of full speed
                    self.rate_proportion = 1.0 - (
                        (self.rate * self.delay_time) / self.actual_model_dt
                    )

        # if we have a desired proportion, use it to control delay_time
        #  Note that we need last_tick to not be None so that we have a
        #  valid dt value.
        if self.target_scale is not None and self.last_tick is not None:
            s = self.target_scale
            if s <= 0:
                self.delay_time = 0.5
            else:
                self.delay_time = (1.0 / s - s) * (dt - self.delay_time)

        # if we have a desired rate, do a simple P-controller to get there
        if self.target_rate is not None:
            rate_error = self.rate - self.target_rate
            delta = rate_error * 0.0000002
            self.delay_time += delta

        self.delay_time = np.clip(self.delay_time, 0, 0.5)

        if self.delay_time > 0:
            self.smart_sleep(self.delay_time)

        self.last_tick = now

        # Sleeps to prevent the simulation from advancing
        # while the simulation is paused
        while self.paused and self.page.sim is not None:
            time.sleep(0.01)
            self.last_tick = None

    def busy_sleep(self, delay_time):
        now = timeit.default_timer()
        start = now
        while now < start + delay_time:
            now = timeit.default_timer()

    def smart_sleep(self, delay_time):
        """Attempt to sleep for an amount of time without a busy loop.

        This keeps track of the difference between the requested time.sleep()
        time and the actual amount of time slept, and then subtracts that
        difference from future smart_sleep calls.  This should give an
        overall consistent sleep() time even if the actual sleep() time
        is inaccurate.
        """
        t = delay_time + self.smart_sleep_offset
        if t >= 0:
            start = timeit.default_timer()
            time.sleep(t)
            end = timeit.default_timer()
            self.smart_sleep_offset += delay_time - (end - start)
        else:
            self.smart_sleep_offset += delay_time

    def config_settings(self, data):
        for i in data:
            print(i)

    def update_client(self, client):
        now = time.time()
        # send off a ping now and then so we'll notice when connection closes
        if self.next_ping_time is None or now > self.next_ping_time:
            client.write_frame(WebSocketFrame(1, 0, WebSocketFrame.OP_PING, 0, b""))
            self.next_ping_time = now + 2.0

        if self.page.changed:
            self.paused = True
            self.page.sim = None
            self.page.changed = False
        if not self.paused or self.reset_inform:
            client.write_binary(
                struct.pack("<fff", self.time, self.rate, self.rate_proportion)
            )
            self.reset_inform = False
        status = self.get_status()
        if status != self.last_status:
            client.write_text("status:%s" % status)
            self.last_status = status
        if self.send_config_options:
            client.write_text("sims:" + self.backend_options_html())
            client.write_text("config" + "Nengo.Toolbar.prototype.config_modal_show();")
            self.send_config_options = False

    def get_status(self):
        if self.paused:
            return "paused"
        elif self.page.sim is None:
            if self.page.error is None:
                return "building"
            else:
                return "build_error"
        else:
            return "running"

    def javascript(self):
        info = dict(uid=id(self))
        fn = json.dumps(self.page.filename)
        js = self.javascript_config(info)
        return (
            "sim = new Nengo.SimControl(control, %s);\n"
            "toolbar = new Nengo.Toolbar(%s);\n"
            "Nengo.sidemenu = new Nengo.SideMenu();" % (js, fn)
        )

    def message(self, msg):
        if msg == "pause":
            self.paused = True
            if "on_pause" in self.page.locals:
                self.page.locals["on_pause"](self.page.sim)
        elif msg == "config":
            self.send_config_options = True
        elif msg == "continue":
            if self.page.sim is None:
                self.page.rebuild = True
            else:
                if "on_continue" in self.page.locals:
                    self.page.locals["on_continue"](self.page.sim)
            self.paused = False
        elif msg == "reset":
            self.paused = True
            self.time = 0
            self.rate = 0
            self.reset_inform = True
            self.page.sim = None
        elif msg[:8] == "backend:":
            self.page.settings.backend = msg[8:]
            self.page.changed = True
        elif msg[:13] == "target_scale:":
            self.target_scale = float(msg[13:])
            self.target_rate = None

    def backend_options_html(self):
        items = []
        for module in nengo_gui.exec_env.discover_backends():
            if module == self.page.settings.backend:
                selected = " selected"
            else:
                selected = ""
            item = "<option %s>%s</option>" % (selected, module)
            items.append(item)
        return "".join(items)
