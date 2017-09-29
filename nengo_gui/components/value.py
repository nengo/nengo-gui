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
        self.legend = legend
        self.synapse = synapse

        # Nengo objects for data collection
        self.node = None
        self.conn = None

    @property
    def n_lines(self):
        return self.output.size_out

    @property
    def output(self):
        if hasattr(self.obj, "output"):
            return self.obj.output
        else:
            return self.obj

    @property
    def synapse(self):
        return self._synapse

    @synapse.setter
    @bind("{self.uid}.synapse")
    def synapse(self, synapse):
        self._synapse = synapse

        # TODO: when GUI sets synapse, should also rebuild sim (don't do it here)
        # if msg.startswith('synapse:'):
        #     synapse = float(msg[8:])
        #     self.page.config[self].synapse = synapse
        #     self.page.modified_config()
        #     self.page.sim = None

    def add_nengo_objects(self, model):
        # create a Node and a Connection so the Node will be given the
        # data we want to show while the model is running.

        data = np.zeros(1 + self.n_lines, dtype=np.float64)

        def fast_send_to_client(t, x):
            data[0] = t
            data[1:] = x
            self.fast_client.send(data)

        with model:
            self.node = nengo.Node(
                fast_send_to_client, size_in=self.n_lines, size_out=0)
            self.conn = nengo.Connection(
                self.output, self.node, synapse=self.synapse)

    def create(self):
        self.client.send("netgraph.create_value",
                         uid=self.uid, label=self.label, n_lines=self.n_lines)

    def dumps(self, names):
        """Important to do correctly, as it's used in the config file."""
        return ("Value(client, {names[self.obj]}, {self.uid}, "
                "ylim={self.ylim}, legend_labels={self.legend_labels}, "
                "synapse={self.synapse}, legend={self.legend}, "
                "pos={self.pos}, label={self.label}".format(
                    names=names, self=self))

    def remove_nengo_objects(self, model):
        # undo the changes made by add_nengo_objects
        model.connections.remove(self.conn)
        model.nodes.remove(self.node)
        self.conn, self.node = None, None

    # TODO: make sure code_python_args never needed
    # def code_python_args(self, uids):
    #     # generate the list of strings for the .cfg file to save this Component
    #     # (this is the text that would be passed in to the constructor)
    #     return [uids[self.obj]]
