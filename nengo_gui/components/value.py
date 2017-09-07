import numpy as np
import nengo
import nengo.spa

from ..client import bind
from .base import Widget


class Value(Widget):
    """The server-side system for a Value plot."""

    def __init__(self, client, obj, uid,
                 ylim=(-1, 1), legend_labels=None, synapse=0.01, legend=False,
                 pos=None, label=None):
        super(Value, self).__init__(client, obj, uid, pos=pos, label=label)

        self.ylim = ylim
        self.legend_labels = [] if legend_labels is None else legend_labels
        self.synapse = synapse
        self.legend = legend

        # TODO: make sure `obj` is a component

        # the number of data values to send
        self.output = self.obj
        if hasattr(self.obj, "output"):
            self.output = self.obj.output

        self.n_lines = int(self.output.size_out)

        # the pending data to be sent to the client
        self.data = np.zeros(1 + self.n_lines, dtype=np.float64)

        # Nengo objects for data collection
        self.node = None
        self.conn = None

    def __repr__(self):
        """Important to do correctly, as it's used in the config file."""
        return ("Value(client, {self.obj.uid}, {self.uid}, ylim={self.ylim}, "
                "legend_labels={self.legend_labels}, synapse={self.synapse}, "
                "legend={self.legend}, pos={self.pos}, "
                "label={self.label}".format(self=self))

    def add_nengo_objects(self, model):
        # create a Node and a Connection so the Node will be given the
        # data we want to show while the model is running.

        def fast_send_to_client(t, x):
            self.data[0] = t
            self.data[1:] = x
            self.fast_client.send(self.data)

        with model:
            self.node = nengo.Node(fast_send_to_client, size_in=self.n_lines)
            self.conn = nengo.Connection(
                self.output, self.node, synapse=self.synapse)

    def remove_nengo_objects(self, model):
        # undo the changes made by add_nengo_objects
        model.connections.remove(self.conn)
        model.nodes.remove(self.node)

    def create(self):
        self.client.send("create_value",
                         uid=self.uid, label=self.label, n_lines=self.n_lines)

    # TODO: make sure code_python_args never needed
    # def code_python_args(self, uids):
    #     # generate the list of strings for the .cfg file to save this Component
    #     # (this is the text that would be passed in to the constructor)
    #     return [uids[self.obj]]

    @bind("{self.uid}.synapse")
    def set_synapse(self, synapse):
        self.synapse = synapse

        # TODO: when GUI sets synapse, should also rebuild sim (don't do it here)
        # if msg.startswith('synapse:'):
        #     synapse = float(msg[8:])
        #     self.page.config[self].synapse = synapse
        #     self.page.modified_config()
        #     self.page.sim = None
