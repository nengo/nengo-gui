import time
import timeit
import struct
import traceback

import numpy as np
import nengo
import os
import os.path
import json

from nengo_gui.components.component import Component
import nengo_gui.exec_env

class SimControl(Component):
    config_defaults = dict(shown_time=0.5, kept_time=4.0)
    def __init__(self, dt=0.001):
        # this component must be the very first one defined, so
        # its component_order is the smallest overall
        super(SimControl, self).__init__(component_order=-10)
        self.paused = True
        self.last_tick = None
        self.rate = 0.0
        self.model_dt = dt
        self.rate_tau = 1.0
        self.last_send_rate = None
        self.sim_ticks = 0
        self.skipped = 1
        self.time = 0.0
        self.last_status = None
        self.next_ping_time = None
        self.send_config_options = False
        self.reset_inform = False

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

        self.last_tick = now

        while self.paused and self.page.sim is not None:
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

        if self.page.changed:
            self.paused = True
            self.page.sim = None
            self.page.changed = False
        if not self.paused or self.reset_inform:
            client.write(struct.pack('<ff', self.time, self.rate), binary=True)
            self.reset_inform = False
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
        elif self.page.sim is None:
            if self.page.error is None:
                return 'building'
            else:
                return 'build_error'
        else:
            return 'running'

    def javascript(self):
        info = dict(uid=id(self))
        fn = json.dumps(self.page.filename)
        js = self.javascript_config(info)
        return ('sim = new Nengo.SimControl(control, %s);\n'
                'toolbar = new Nengo.Toolbar(%s); ' % (js, fn))

    def message(self, msg):
        if msg == 'pause':
            self.paused = True
        elif msg == 'config':
            self.send_config_options = True
        elif msg == 'continue':
            if self.page.sim is None:
                self.page.rebuild = True
            self.paused = False
        elif msg == 'reset':
            self.paused = True
            self.time = 0
            self.rate = 0
            self.reset_inform = True
            self.page.sim = None
        elif msg[:8] == 'backend:':
            self.page.backend = msg[8:]
            self.page.changed = True

    def backend_options_html(self):
        items = []
        for module in nengo_gui.exec_env.discover_backends():
            if module == self.page.backend:
                selected = ' selected'
            else:
                selected = ''
            item = '<option %s>%s</option>' % (selected, module)
            items.append(item)
        return ''.join(items)
