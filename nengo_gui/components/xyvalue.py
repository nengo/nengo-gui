import struct
import collections

import nengo
import numpy as np

from nengo_gui.components.component import Component, Template


class XYValue(Component):
    def __init__(self, sim, config, uid, obj):
        super(XYValue, self).__init__(sim, config, uid)
        self.obj = obj
        self.label = sim.get_label(obj)
        self.data = collections.deque()
        self.n_lines = int(obj.size_out)
        self.struct = struct.Struct('<%df' % (1 + self.n_lines))

    def add_nengo_objects(self, sim):
        with sim.model:
            self.node = nengo.Node(self.gather_data,
                                   size_in=self.obj.size_out)
            self.conn = nengo.Connection(self.obj, self.node, synapse=None)

    def remove_nengo_objects(self, sim):
        sim.model.connections.remove(self.conn)
        sim.model.nodes.remove(self.node)

    def gather_data(self, t, x):
        self.data.append(self.struct.pack(t, *x))

    def update_client(self, client):
        while len(self.data) > 0:
            data = self.data.popleft()
            client.write(data, binary=True)

    def javascript(self):
        info = dict(uid=self.uid, n_lines=self.n_lines, label=self.label)
        json = self.javascript_config(info)
        return 'new Nengo.XYValue(main, sim, %s);' % json

class XYValueTemplate(Template):
    cls = XYValue
    config_params = dict(max_value=1, min_value=-1, index_x=0, index_y=1,
                         **Template.default_params)
