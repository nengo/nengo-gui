import struct
import collections

import nengo
import numpy as np

from nengo_gui.components.component import Component, Template


class HTMLView(Component):
    def __init__(self, viz, config, uid, obj):
        super(HTMLView, self).__init__(viz, config, uid)
        self.obj = obj
        self.obj_output = obj.output
        self.label = viz.viz.get_label(obj)
        self.data = collections.deque()

    def add_nengo_objects(self, viz):
        with viz.model:
            self.obj.output = self.gather_data

    def remove_nengo_objects(self, viz):
        self.obj.output = self.obj_output

    def gather_data(self, t, *x):
        value = self.obj_output(t, *x)
        data = '%g %s' % (t, self.obj_output._nengo_html_)
        self.data.append(data)
        return value

    def update_client(self, client):
        while len(self.data) > 0:
            item = self.data.popleft()
            client.write(item)

    def javascript(self):
        info = dict(uid=self.uid, label=self.label)
        json = self.javascript_config(info)
        return 'new Nengo.HTMLView(main, sim, %s);' % json

class HTMLViewTemplate(Template):
    cls = HTMLView
    config_params = dict(**Template.default_params)
