import nengo
import numpy as np

from .base import Widget


# TODO: does this need a separate widget from value?
class XYValue(Widget):
    """Represents two values as co-ordinates on an x-y plot."""

    def __init__(self, client, obj, uid,
                 xlim=(-1, 1), ylim=(-1, 1), index_x=0, index_y=1,
                 pos=None, label=None):
        super(XYValue, self).__init__(client, obj, uid, pos=pos, label=label)
        self.node = None
        self.conn = None

    @property
    def n_lines(self):
        return int(self.obj.size_out)

    def add_nengo_objects(self, model):

        data = np.zeros(self.n_lines + 1)

        def fast_send_to_client(t, x):
            data[0] = t
            data[1:] = x
            self.fast_client.send(data)

        with model:
            self.node = nengo.Node(fast_send_to_client,
                                   size_in=self.obj.size_out,
                                   size_out=0)
            # TODO: make synapse modifiable?
            self.conn = nengo.Connection(self.obj, self.node, synapse=0.01)

    def create(self):
        self.client.send("netgraph.create_xyvalue",
                         uid=self.uid, n_lines=self.n_lines, label=self.label)

    def remove_nengo_objects(self, model):
        model.connections.remove(self.conn)
        model.nodes.remove(self.node)
        self.conn, self.node = None, None
