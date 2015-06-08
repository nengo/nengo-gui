import time
import struct
import traceback

import numpy as np
import nengo
import os
import os.path
import json

from nengo_gui.components.component import Component, Template
import nengo_gui.monkey

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
        self.next_ping_time = None
        self.send_config_options = False

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

        while self.paused and self.viz.sim is not None:
            time.sleep(0.01)
            self.last_tick = None

    def config_settings(self, data):
        for i in data:
            print(i)

    def update_client(self, client):
        now = time.time()
        # send off a ping now and then so we'll notice when connection closes
        if self.next_ping_time is None or now > self.next_ping_time:
            client.write('', ping=True)
            self.next_ping_time = now + 2.0

        if self.viz.changed:
            self.paused = True
            self.viz.sim = None
            self.viz.changed = False
        if not self.paused:
            client.write(struct.pack('<ff', self.time, self.rate), binary=True)
        status = self.get_status()
        if status != self.last_status:
            client.write('status:%s' % status)
            self.last_status = status
        if self.send_config_options == True:
            client.write('sims:' + self.backend_options_html())
            client.write('config' +
                'Nengo.Toolbar.prototype.config_modal_show();')
            self.send_config_options = False

    def get_status(self):
        if self.paused:
            return 'paused'
        elif self.viz.sim is None:
            return 'building'
        else:
            return 'running'

    def javascript(self):
        info = dict(uid=self.uid)
        fn = json.dumps(self.viz.viz.filename)
        js = self.javascript_config(info)
        return ('sim = new Nengo.SimControl(control, %s);\n'
                'toolbar = new Nengo.Toolbar(%s); ' % (js, fn))

    def message(self, msg):
        if msg == 'pause':
            self.paused = True
        elif msg == 'config':
            self.send_config_options = True
        elif msg == 'continue':
            if self.viz.sim is None:
                self.viz.rebuild = True
            self.paused = False
        elif msg[:8] == 'backend:':
            self.viz.backend = msg[8:]
            self.viz.changed = True

    def backend_options_html(self):
        items = []
        for module in nengo_gui.monkey.found_modules:
            if module == self.viz.backend:
                selected = ' selected'
            else:
                selected = ''
            item = '<option %s>%s</option>' % (selected, module)
            items.append(item)
        return ''.join(items)


class SimControlTemplate(Template):
    cls = SimControl
    config_params = dict(shown_time=0.5, kept_time=4.0)
