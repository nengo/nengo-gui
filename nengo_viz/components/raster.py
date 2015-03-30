import nengo
import numpy as np
import struct

from nengo_viz.components.component import Component


class Raster(Component):
    def __init__(self, viz, config, uid, obj, n_neurons=None):
        super(Raster, self).__init__(viz, config, uid)
        self.obj = obj.neurons
        self.data = []
        self.label = viz.viz.get_label(obj)
        self.max_neurons = self.obj.size_out
        if n_neurons is None:
            n_neurons = min(self.obj.size_out, 10)
        self.n_neurons = n_neurons

    def add_nengo_objects(self, viz):
        with viz.model:
            self.node = nengo.Node(self.gather_data, size_in=self.obj.size_out)
            self.conn = nengo.Connection(self.obj, self.node, synapse=None)

    def remove_nengo_objects(self, viz):
        viz.model.connections.remove(self.conn)
        viz.model.nodes.remove(self.node)

    def gather_data(self, t, x):
        indices = np.nonzero(x[:self.n_neurons])[0]
        data = struct.pack('<f%dH' % len(indices), t, *indices)
        self.data.append(data)

    def update_client(self, client):
        while len(self.data) > 0:
            data = self.data.pop(0)
            client.write(data, binary=True)

    def javascript(self):
        info = dict(uid=self.uid, n_neurons=self.n_neurons, label=self.label,
                    max_neurons=self.max_neurons)
        json = self.javascript_config(info)
        return 'new VIZ.Raster(main, sim, %s);' % json
