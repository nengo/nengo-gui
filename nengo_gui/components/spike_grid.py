import struct

import nengo
import numpy as np
from nengo_gui.components.component import Component


class SpikeGrid(Component):
    """Represents an ensemble of neurons as squares in a grid.

    The color of the squares corresponds to the neuron spiking.
    """

    def __init__(self, obj, n_neurons=None):
        super(SpikeGrid, self).__init__()
        self.obj = obj
        self.data = []
        self.max_neurons = self.obj.neurons.size_out
        if n_neurons is None:
            n_neurons = self.max_neurons
        self.n_neurons = n_neurons
        self.pixels_x = np.ceil(np.sqrt(self.n_neurons))
        self.pixels_y = np.ceil(float(self.n_neurons) / self.pixels_x)
        self.n_pixels = self.pixels_x * self.pixels_y
        self.struct = struct.Struct("<f%dB" % (self.n_pixels))
        self.max_value = 1.0
        self.node = None
        self.conn = None

    def attach(self, page, config, uid):
        super(SpikeGrid, self).attach(page, config, uid)
        self.label = page.get_label(self.obj)

    def add_nengo_objects(self, page):
        with page.model:
            self.node = nengo.Node(self.gather_data, size_in=self.obj.neurons.size_out)
            self.conn = nengo.Connection(self.obj.neurons, self.node, synapse=0.01)

    def remove_nengo_objects(self, page):
        page.model.connections.remove(self.conn)
        page.model.nodes.remove(self.node)

    def gather_data(self, t, x):
        self.max_value = max(self.max_value, np.max(x))
        if len(x) > self.n_neurons:
            x = x[: self.n_neurons]
        y = np.zeros(int(self.n_pixels), dtype=np.uint8)
        if self.max_value > 0:
            y[: x.size] = x * 255 / self.max_value
        data = self.struct.pack(t, *y)
        self.data.append(data)

    def update_client(self, client):
        length = len(self.data)
        if length > 0:
            item = bytes().join(self.data[:length])
            del self.data[:length]
            try:
                client.write_binary(item)
            except:
                # if there is a communication problem, just drop the frames
                # (this usually happens when there is too much data to send)
                pass

    def javascript(self):
        info = dict(
            uid=id(self),
            label=self.label,
            pixels_x=self.pixels_x,
            pixels_y=self.pixels_y,
        )
        json = self.javascript_config(info)
        return "new Nengo.Image(main, sim, %s);" % json

    def code_python_args(self, uids):
        args = [uids[self.obj]]
        if self.n_neurons != self.max_neurons:
            args.append("n_neurons=%d" % self.n_neurons)
        return args
