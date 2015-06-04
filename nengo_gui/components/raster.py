import struct
import collections

import nengo
import numpy as np

from nengo_gui.components.component import Component, Template


class Raster(Component):
    def __init__(self, viz, config, uid, obj, n_neurons=None):
        super(Raster, self).__init__(viz, config, uid)
        self.neuron_type = obj.neuron_type
        self.obj = obj.neurons
        self.data = collections.deque()
        self.label = viz.viz.get_label(obj)
        self.max_neurons = obj.n_neurons
        if n_neurons is None:
            n_neurons = min(self.max_neurons, 10)
        self.n_neurons = n_neurons

    def add_nengo_objects(self, viz):
        with viz.model:
            self.node = nengo.Node(self.gather_data, size_in=self.max_neurons)
            if 'spikes' in self.neuron_type.probeable:
                self.conn = nengo.Connection(self.obj, self.node, synapse=None)

    def remove_nengo_objects(self, viz):
        viz.model.nodes.remove(self.node)
        if 'spikes' in self.neuron_type.probeable:
            viz.model.connections.remove(self.conn)

    def gather_data(self, t, x):
        indices = np.nonzero(x[:self.n_neurons])[0]
        data = struct.pack('<f%dH' % len(indices), t, *indices)
        self.data.append(data)

    def update_client(self, client):
        while len(self.data) > 0:
            data = self.data.popleft()
            client.write(data, binary=True)

    def javascript(self):
        info = dict(uid=self.uid, n_neurons=self.n_neurons, label=self.label,
                    max_neurons=self.max_neurons)
        json = self.javascript_config(info)
        return 'new Nengo.Raster(main, sim, %s);' % json


class RasterTemplate(Template):
    cls = Raster
    config_params = dict(**Template.default_params)
