import struct
import collections

import nengo
import numpy as np

from nengo_gui.components.component import Component


class Value(Component):
    config_params = dict(max_value=1,
                         min_value=-1, 
                         **Component.default_params)
    def __init__(self, obj):
        super(Value, self).__init__()
        self.obj = obj
        self.data = collections.deque()
        self.n_lines = int(obj.size_out)
        self.struct = struct.Struct('<%df' % (1 + self.n_lines))

    def initialize(self, page, config, uid):
        super(Value, self).initialize(page, config, uid)
        self.label = page.get_label(self.obj)

    def add_nengo_objects(self, page):
        with page.model:
            self.node = nengo.Node(self.gather_data,
                                   size_in=self.obj.size_out)
            self.conn = nengo.Connection(self.obj, self.node, synapse=0.01)

    def remove_nengo_objects(self, page):
        page.model.connections.remove(self.conn)
        page.model.nodes.remove(self.node)

    def gather_data(self, t, x):
        self.data.append(self.struct.pack(t, *x))

    def update_client(self, client):
        while len(self.data) > 0:
            item = self.data.popleft()
            client.write(item, binary=True)

    def javascript(self):
        info = dict(uid=id(self), label=self.label,
                    n_lines=self.n_lines, synapse=0)
        json = self.javascript_config(info)
        return 'new Nengo.Value(main, sim, %s);' % json

    def code_python_args(self, uids):
        return [uids[self.obj]]

ValueTemplate = Value
