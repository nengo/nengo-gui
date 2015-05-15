import nengo
import numpy as np
import struct

from nengo_viz.components.component import Component, Template


class Value(Component):
    class Template(Template):
        def __init__(self, target):
            super(Template, self).__init__(target)

    def __init__(self, viz, config, uid, obj):
        super(Value, self).__init__(viz, config, uid)
        self.obj = obj
        self.label = viz.viz.get_label(obj)
        self.data = []
        self.n_lines = obj.size_out
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
            data = self.data.pop(0)
            client.write(data, binary=True)

    def javascript(self):
        info = dict(uid=self.uid, n_lines=self.n_lines, label=self.label)
        json = self.javascript_config(info)
        return 'new VIZ.Value(main, sim, %s);' % json
