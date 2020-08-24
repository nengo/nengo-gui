import collections
import struct

import nengo
import numpy as np
from nengo_gui.components.component import Component


def is_spiking(neuron_type):
    try:
        return neuron_type.spiking
    except AttributeError:
        return "spikes" in neuron_type.probeable


class Raster(Component):
    """Plot showing spike events over time."""

    config_defaults = dict(n_neurons=10, **Component.config_defaults)

    def __init__(self, obj):
        super(Raster, self).__init__()
        self.neuron_type = obj.neuron_type
        self.obj = obj.neurons
        self.data = collections.deque()
        self.max_neurons = obj.n_neurons

        self.conn = None
        self.node = None
        self.chosen = None

    def attach(self, page, config, uid):
        super(Raster, self).attach(page, config, uid)
        self.label = page.get_label(self.obj.ensemble)

    def add_nengo_objects(self, page):
        with page.model:
            self.node = nengo.Node(self.gather_data, size_in=self.max_neurons)
            if is_spiking(self.neuron_type):
                self.conn = nengo.Connection(self.obj, self.node, synapse=None)

    def remove_nengo_objects(self, page):
        page.model.nodes.remove(self.node)
        if is_spiking(self.neuron_type):
            page.model.connections.remove(self.conn)

    def gather_data(self, t, x):
        if self.chosen is None:
            self.compute_chosen_neurons()
        indices = np.nonzero(x[self.chosen])[0]
        data = struct.pack("<f%dH" % len(indices), t, *indices)
        self.data.append(data)

    def compute_chosen_neurons(self):
        n_neurons = self.page.config[self].n_neurons
        n_neurons = min(n_neurons, self.max_neurons)
        self.chosen = np.linspace(0, self.max_neurons - 1, n_neurons).astype(int)

    def update_client(self, client):
        while len(self.data) > 0:
            data = self.data.popleft()
            client.write_binary(data)

    def javascript(self):
        info = dict(uid=id(self), label=self.label, max_neurons=self.max_neurons)
        json = self.javascript_config(info)
        return "new Nengo.Raster(main, sim, %s);" % json

    def code_python_args(self, uids):
        return [uids[self.obj.ensemble]]

    def message(self, msg):
        if msg.startswith("n_neurons:"):
            n_neurons = min(int(msg[10:]), self.max_neurons)
            self.page.config[self].n_neurons = n_neurons
            self.compute_chosen_neurons()
            self.page.modified_config()
