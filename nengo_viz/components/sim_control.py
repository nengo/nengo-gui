import time
import struct

import numpy as np
import nengo

from nengo_viz.components.component import Component

class SimControl(Component):
    def __init__(self, viz, shown_time=0.5, kept_time=4.0, **kwargs):
        super(SimControl, self).__init__(viz, **kwargs)
        self.viz = viz
        with viz.model:
            self.node = nengo.Node(self.control, size_out=0)
        self.paused = False
        self.last_tick = None
        self.rate = 0.0
        self.model_dt = viz.dt
        self.rate_tau = 1.0
        self.last_send_rate = None
        self.shown_time = shown_time
        self.kept_time = kept_time
        self.sim_ticks = 0
        self.skipped = 1
        self.time = 0.0

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

        #client.write('ticks:%g' % self.sim_ticks)
        #now = time.time()
        #if self.last_send_rate is None or now - self.last_send_rate > 1.0:
        #    client.write('rate:%g' % self.rate)
        #    self.last_send_rate = now

    def javascript(self):
        return ('var sim = new VIZ.SimControl(control, {id:%(id)d,'
                'shown_time:%(shown_time)g, kept_time:%(kept_time)g});' %
                 dict(id=id(self), shown_time=self.shown_time,
                     kept_time=self.kept_time))

    def message(self, msg):
        if msg == 'pause':
            self.paused = True
        elif msg == 'continue':
            self.paused = False
