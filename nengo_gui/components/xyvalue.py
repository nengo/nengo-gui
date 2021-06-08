import collections
import struct

import nengo
from nengo_gui.components.component import Component


class XYValue(Component):
    """Represents (at least) two dimensional values as co-ordinates on an
    x-y plot."""

    config_defaults = dict(
        max_value=1, min_value=-1, index_x=0, index_y=1, **Component.config_defaults
    )

    def __init__(self, obj):
        super(XYValue, self).__init__()
        self.obj = obj
        self.data = collections.deque()
        self.n_lines = int(obj.size_out)
        self.struct = struct.Struct("<%df" % (1 + self.n_lines))
        self.node = None
        self.conn = None

    def attach(self, page, config, uid):
        super(XYValue, self).attach(page, config, uid)
        self.label = page.get_label(self.obj)

    def add_nengo_objects(self, page):
        with page.model:
            self.node = nengo.Node(self.gather_data, size_in=self.obj.size_out)
            self.conn = nengo.Connection(self.obj, self.node, synapse=0.01)

    def remove_nengo_objects(self, page):
        page.model.connections.remove(self.conn)
        page.model.nodes.remove(self.node)

    def gather_data(self, t, x):
        self.data.append(self.struct.pack(t, *x))

    def update_client(self, client):
        while len(self.data) > 0:
            data = self.data.popleft()
            client.write_binary(data)

    def javascript(self):
        info = dict(uid=id(self), n_lines=self.n_lines, label=self.label)
        json = self.javascript_config(info)
        return "new Nengo.XYValue(main, sim, %s);" % json

    def code_python_args(self, uids):
        return [uids[self.obj]]
