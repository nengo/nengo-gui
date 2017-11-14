import nengo
import numpy as np

from .base import Widget


class SpikeGrid(Widget):
    """Represents an ensemble of neurons as squares in a grid.

    The color of the squares corresponds to the neuron spiking.
    """

    def __init__(self, client, obj, uid, n_neurons=None, pos=None, label=None):
        super(SpikeGrid, self).__init__(client, obj, uid, pos=pos, label=label)
        self.n_neurons = self.max_neurons if n_neurons is None else n_neurons

        self.max_value = 1.0
        self.node = None
        self.conn = None

    @property
    def max_neurons(self):
        return self.obj.neurons.size_out

    @property
    def n_pixels(self):
        return self.pixels_x * self.pixels_y

    @property
    def pixels_x(self):
        return int(np.ceil(np.sqrt(self.n_neurons)))

    @property
    def pixels_y(self):
        return int(np.ceil(float(self.n_neurons) / self.pixels_x))

    def add_nengo_objects(self, model):

        def fast_send_to_client(t, x):
            self.max_value = max(self.max_value, np.max(x))

            # TODO: Does this every happen? Can it???
            # if x.size > self.n_neurons:
            #     x = x[:self.n_neurons]
            y = (x * 255 / self.max_value).astype(np.uint8)
            self.fast_client.send(y)

            # try:
            #     client.write_binary(item)
            # except:
            #     # if there is a communication problem, just drop the frames
            #     # (this usually happens when there is too much data to send)
            #     pass

            # y = np.zeros(int(self.n_pixels), dtype=np.uint8)
            # if self.max_value > 0:
            #     y[:x.size] = x * 255 / self.max_value
            # data = self.struct.pack(t, *y)
            # self.data.append(data)

        with model:
            self.node = nengo.Node(
                fast_send_to_client,
                size_in=self.obj.neurons.size_out,
                size_out=0)
            self.conn = nengo.Connection(
                self.obj.neurons, self.node, synapse=0.01)

    def create(self):
        self.client.send("netgraph.create_spike_grid",
                         uid=self.uid,
                         pos=self.pos,
                         dimensions=1,  # TODO
                         synapse=0.005,  # TODO
                         xlim=[-0.5, 0],  # TODO
                         ylim=[-1, 1])  # TODO

    def remove_nengo_objects(self, model):
        model.connections.remove(self.conn)
        model.nodes.remove(self.node)
        self.conn, self.node = None, None
