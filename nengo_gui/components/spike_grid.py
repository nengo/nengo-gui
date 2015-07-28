import nengo
import numpy as np
import struct

from nengo_gui.components.component import Component, Template


class SpikeGrid(Component):
    def __init__(self, viz, config, uid, obj, n_neurons=None):
        super(SpikeGrid, self).__init__(viz, config, uid)
        self.obj = obj.neurons
        self.data = []
        self.label = viz.viz.get_label(obj)
        self.max_neurons = self.obj.size_out
        if n_neurons is None:
            n_neurons = self.max_neurons
        self.n_neurons = n_neurons
        self.pixels_x = np.ceil(np.sqrt(self.n_neurons))
        self.pixels_y = np.ceil(float(self.n_neurons) / self.pixels_x)
        self.n_pixels = self.pixels_x * self.pixels_y
        self.struct = struct.Struct('<%dB' % (1 + self.n_pixels))
        self.max_value = 1.0

    def add_nengo_objects(self, viz):
        with viz.model:
            self.node = nengo.Node(self.gather_data, size_in=self.obj.size_out)
            self.conn = nengo.Connection(self.obj, self.node, synapse=0.01)

    def remove_nengo_objects(self, viz):
        viz.model.connections.remove(self.conn)
        viz.model.nodes.remove(self.node)

    def gather_data(self, t, x):
        self.max_value = max(self.max_value, np.max(x))

        # TODO: pass only spiking neurons, using subclass of Nengo.Image?
        #   Considerations include how to filter if we're only passing spike
        #   times, i.e. need to write a new DataStore.
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
        info = dict(uid=self.uid, label=self.label,
                    pixels_x=self.pixels_x, pixels_y=self.pixels_y)
        json = self.javascript_config(info)
        return 'new Nengo.Image(main, sim, %s);' % json


class SpikeGridTemplate(Template):
    cls = SpikeGrid
    config_params = dict(**Template.default_params)
