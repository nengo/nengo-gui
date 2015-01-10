import time

import numpy as np
import nengo

from nengo_viz.components.component import Component

class TimeControl(Component):
    def __init__(self, viz, **kwargs):
        super(TimeControl, self).__init__(viz, **kwargs)
        with viz.model:
            self.node = nengo.Node(self.control, size_out=0)
        self.paused = False
        self.last_tick = None
        self.rate = 0.0
        self.model_dt = viz.dt
        self.rate_tau = 1.0
        self.last_send_rate = None
        self.sim_ticks = 0
        self.skipped = 1

    def control(self, t):
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
        client.write('ticks:%g' % self.sim_ticks)
        now = time.time()
        if self.last_send_rate is None or now - self.last_send_rate > 1.0:
            client.write('rate:%g' % self.rate)
            self.last_send_rate = now

    def javascript(self):
        return ('new VIZ.TimeControl({parent:control, '
                'x:%(x)g, y:%(x)g, '
                'width:%(width)g, height:%(height)g, id:%(id)d});' %
                dict(x=self.x, y=self.y, width=self.width, height=self.height,
                 id=id(self)))

    def message(self, msg):
        if msg == 'pause':
            self.paused = True
        elif msg == 'continue':
            self.paused = False
