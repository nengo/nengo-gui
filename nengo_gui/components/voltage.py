from __future__ import division

import nengo
import numpy as np

from .base import Widget


class Voltage(Widget):
    """Represents neuron voltage over time."""

    def __init__(self, client, obj, uid,
                 ylim=(0, 5), n_neurons=5, pos=None, label=None):
        super(Voltage, self).__init__(client, obj, uid, pos=pos, label=label)
        self.max_neurons = int(self.obj.size_out)
        self.n_neurons = min(n_neurons, self.max_neurons)

    @property
    def max_neurons(self):
        return self.obj.obj.neurons.size_out

    def add_nengo_objects(self, model):
        with model:
            # Note: this probe is read in simcontrol.control, which is a
            # huge terrible hack.
            self.probe = nengo.Probe(
                self.obj.obj.neurons[:self.n_neurons], 'voltage')

    def remove_nengo_objects(self, model):
        model.probes.remove(self.probe)

    def create(self):
        self.client.send("create_voltage",
                         uid=self.uid, label=self.label,
                         n_lines=self.n_neurons, synapse=0)

    # def code_python_args(self, uids):
    #     return [uids[self.obj.ensemble]]
