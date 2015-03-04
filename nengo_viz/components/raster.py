import nengo
import numpy as np
import struct

from nengo_viz.components.component import Component


class Raster(Component):
    def __init__(self, viz, obj, n_neurons=None, **kwargs):
        super(Raster, self).__init__(viz, **kwargs)
        self.obj = obj
        self.data = []
        self.label = viz.viz.get_label(obj.ensemble)
        if n_neurons is None:
            n_neurons = obj.size_out
        self.n_neurons = n_neurons
        with viz.model:
            self.node = nengo.Node(self.gather_data, size_in=obj.size_out)
            self.conn = nengo.Connection(obj, self.node, synapse=None)

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
        return ('new VIZ.Raster({parent:main, sim:sim, '
                'x:%(x)g, y:%(y)g, label:%(label)s, '
                'width:%(width)g, height:%(height)g, id:%(id)d, '
                'n_neurons:%(n_neurons)d});' %
                dict(x=self.x, y=self.y, width=self.width, height=self.height,
                     id=id(self), n_neurons=self.n_neurons,
                     label=`self.label`,
                     ))
