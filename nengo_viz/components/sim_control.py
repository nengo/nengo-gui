import time
import struct

import numpy as np
import nengo

from nengo_viz.components.component import Component

class SimControl(Component):
    def __init__(self, viz, config, uid, dt=0.001):
        super(SimControl, self).__init__(viz, config, uid)
        self.viz = viz
        self.paused = True
        self.last_tick = None
        self.rate = 0.0
        self.model_dt = dt
        self.rate_tau = 1.0
        self.last_send_rate = None
        self.shown_time = config.shown_time
        self.kept_time = config.kept_time
        self.sim_ticks = 0
        self.skipped = 1
        self.time = 0.0
        self.last_status = None

    def add_nengo_objects(self, viz):
        with viz.model:
            self.node = nengo.Node(self.control, size_out=0)

    def remove_nengo_objects(self, viz):
        viz.model.nodes.remove(self.node)

    def finish(self):
        self.viz.finish()

    def control(self, t):
        self.time = t
        self.sim_ticks += 1

        now = time.time()
        if self.last_tick is not None:
            dt = now - self.last_tick
            if dt == 0:
                self.skipped += 1
            else:
                rate = self.model_dt * self.skipped / dt
                decay = np.exp(-dt / self.rate_tau)
                self.rate *= decay
                self.rate += (1 - decay) * rate
                self.skipped = 1

        self.last_tick = now

        while self.paused:
            time.sleep(0.01)
            self.last_tick = None

    def update_client(self, client):
        if not self.paused:
            client.write(struct.pack('<ff', self.time, self.rate), binary=True)
        status = self.get_status()
        if status != self.last_status:
            client.write('status:%s' % status)
            self.last_status = status

    def get_status(self):
        if self.paused:
            return 'paused'
        elif self.viz.sim is None:
            return 'building'
        else:
            return 'running'

    def javascript(self):
        info = dict(uid=self.uid)
        json = self.javascript_config(info)
        return 'var sim = new VIZ.SimControl(control, %s)' % json

    def message(self, msg):
        if msg == 'pause':
            self.paused = True
        elif msg == 'continue':
            if self.viz.sim is None:
                self.viz.rebuild = True
            self.paused = False
