import nengo
import numpy as np
import struct

from nengo_gui.components.component import Component

class SpikeGrid(Component):
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
        self.struct = struct.Struct('<%dB' % (1 + self.n_pixels))
        self.max_value = 1.0

    def attach(self, page, config, uid):
        super(SpikeGrid, self).attach(page, config, uid)
        self.label = page.get_label(self.obj)

    def add_nengo_objects(self, page):
        with page.model:
            self.node = nengo.Node(self.gather_data,
                                   size_in=self.obj.neurons.size_out)
            self.conn = nengo.Connection(self.obj.neurons,
                                         self.node, synapse=0.01)

    def remove_nengo_objects(self, page):
        page.model.connections.remove(self.conn)
        page.model.nodes.remove(self.node)

    def gather_data(self, t, x):
        self.max_value = max(self.max_value, np.max(x))

        # TODO: pass only spiking neurons, using subclass of Nengo.Image?
        #   Considerations include how to filter if we're only passing spike
        #   times, i.e. need to write a new DataStore.
        if len(x) > self.n_neurons:
            x = x[:self.n_neurons]
        y = np.zeros(self.n_pixels, dtype=np.uint8)
        y[:x.size] = x * 255 / self.max_value
        data = self.struct.pack(t, *y)
        self.data.append(data)

    def update_client(self, client):
        while len(self.data) > 0:
            data = self.data.pop(0)
            try:
                client.write(data, binary=True)
            except:
                # if there is a communication problem, just drop the frame
                # (this usually happens when there is too much data to send)
                pass

    def javascript(self):
        info = dict(uid=id(self), label=self.label,
                    pixels_x=self.pixels_x, pixels_y=self.pixels_y)
        json = self.javascript_config(info)
        return 'new Nengo.Image(main, sim, %s);' % json

    def code_python_args(self, uids):
        args = [uids[self.obj]]
        if self.n_neurons != self.max_neurons:
            args.append('n_neurons=%d' % self.n_neurons)
        return args
