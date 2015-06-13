import struct
import collections

import nengo
import numpy as np

from nengo_gui.components.component import Component, Template


class Value(Component):
    def __init__(self, viz, config, uid, obj):
        super(Value, self).__init__(viz, config, uid)
        self.obj = obj
        self.label = viz.viz.get_label(obj)
        self.data = collections.deque()
        self.n_lines = int(obj.size_out)
        self.struct = struct.Struct('<%df' % (1 + self.n_lines))

    def add_nengo_objects(self, viz):
        with viz.model:
            self.node = nengo.Node(self.gather_data,
                                   size_in=self.obj.size_out)
            self.conn = nengo.Connection(self.obj, self.node, synapse=None)

    def remove_nengo_objects(self, viz):
        viz.model.connections.remove(self.conn)
        viz.model.nodes.remove(self.node)

    def gather_data(self, t, x):
        self.data.append(self.struct.pack(t, *x))

    def update_client(self, client):
        while len(self.data) > 0:
            item = self.data.popleft()
            client.write(item, binary=True)

    def javascript(self):
        info = dict(uid=self.uid, label=self.label,
                    n_lines=self.n_lines, synapse=0.01)
        json = self.javascript_config(info)
        return 'new Nengo.Value(main, sim, %s);' % json

class ValueTemplate(Template):
    cls = Value
    config_params = dict(max_value=1, min_value=-1, **Template.default_params)
