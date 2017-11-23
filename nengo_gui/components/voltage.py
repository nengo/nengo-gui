from __future__ import division

import nengo

from .base import Widget


class Voltage(Widget):
    """Represents neuron voltage over time."""

    def __init__(self, client, obj, uid,
                 ylim=(0, 5), n_neurons=5, pos=None, label_visible=True):
        super(Voltage, self).__init__(
            client, obj, uid, pos=pos, label_visible=label_visible)
        self.n_neurons = min(n_neurons, self.max_neurons)

    @property
    def max_neurons(self):
        return self.obj.neurons.size_out

    def add_nengo_objects(self, model):
        with model:
            # Note: this probe is read in simcontrol.control, which is a
            # huge terrible hack.
            self.probe = nengo.Probe(
                self.obj.neurons[:self.n_neurons], 'voltage')

    def create(self):
        self.client.send("netgraph.create_voltage",
                         uid=self.uid,
                         label=self.label,
                         labelVisible=self.label_visible,
                         n_neurons=self.n_neurons,
                         synapse=0)

    def remove_nengo_objects(self, model):
        model.probes.remove(self.probe)
        self.probe = None
