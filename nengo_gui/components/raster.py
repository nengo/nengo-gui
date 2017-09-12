import nengo
import numpy as np

from ..client import bind
from .base import Widget


class Raster(Widget):
    """Plot showing spike events over time."""

    def __init__(self, client, obj, uid, n_neurons=10, pos=None, label=None):
        super(Raster, self).__init__(client, obj, uid, pos, label)

        self.chosen = None  # Filled in when n_neurons set

        self.n_neurons = n_neurons

        self.conn = None
        self.node = None

    @property
    def max_neurons(self):
        return self.obj.obj.n_neurons

    @property
    def n_neurons(self):
        return self._n_neurons

    @n_neurons.setter
    @bind("{self.uid}.n_neurons")
    def n_neurons(self, n_neurons):
        self._n_neurons = min(n_neurons, self.max_neurons)
        self.chosen = np.linspace(
            0, self.max_neurons-1, self._n_neurons).astype(int)

    @property
    def neurons(self):
        return self.obj.obj.neurons

    @property
    def neuron_type(self):
        return self.obj.obj.neuron_type

    def add_nengo_objects(self, model):

        def fast_send_to_client(t, x):
            indices = np.nonzero(x[self.chosen])[0]
            self.fast_client.send(np.hstack((t, indices)))

        with model:
            self.node = nengo.Node(fast_send_to_client,
                                   size_in=self.max_neurons)
            if 'spikes' in self.neuron_type.probeable:
                self.conn = nengo.Connection(
                    self.neurons, self.node, synapse=None)

    def create(self):
        self.client.send("netgraph.create_raster",
                         label=self.label, max_neurons=self.max_neurons)

    def remove_nengo_objects(self, model):
        model.nodes.remove(self.node)
        self.node = None
        if self.conn is not None:
            model.connections.remove(self.conn)
            self.conn = None
