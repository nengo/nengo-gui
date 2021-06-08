from __future__ import division

import struct

import nengo
import numpy as np
from nengo_gui.components.component import Component


class Voltage(Component):
    """Represents neuron voltage over time."""

    config_defaults = dict(
        max_value=5.0,
        min_value=0.0,
        show_legend=False,
        legend_labels=[],
        **Component.config_defaults,
    )

    def __init__(self, obj, n_neurons=5):
        super(Voltage, self).__init__()
        self.obj = obj.neurons
        self.data = []
        self.max_neurons = int(self.obj.size_out)
        self.n_neurons = min(n_neurons, self.max_neurons)
        self.struct = struct.Struct("<%df" % (1 + self.n_neurons))

    def attach(self, page, config, uid):
        super(Voltage, self).attach(page, config, uid)
        self.label = page.get_label(self.obj.ensemble)

    def add_nengo_objects(self, page):
        with page.model:
            self.probe = nengo.Probe(self.obj[: self.n_neurons], "voltage")

    def remove_nengo_objects(self, page):
        page.model.probes.remove(self.probe)

    def format_data(self, t, x):
        data = self.struct.pack(t, *x[: self.n_neurons])
        self.data.append(data)

    def update_client(self, client):
        sim = self.page.sim
        if sim is None:
            return

        # TODO: this is hack to delete probe data in Nengo 2.0.1, since we
        # can't limit the size of probes. Fix this up with Nengo 2.1.
        data = sim.data.raw[self.probe][:]
        del sim.data.raw[self.probe][:]  # clear the data
        trange = sim.trange()[-len(data) :]

        for t, datum in zip(trange, data):
            datum = datum + np.arange(self.n_neurons)
            packet = self.struct.pack(t, *datum)
            client.write_binary(packet)

    def javascript(self):
        info = dict(uid=id(self), label=self.label, n_lines=self.n_neurons, synapse=0)
        json = self.javascript_config(info)
        return "new Nengo.Value(main, sim, %s);" % json

    def code_python_args(self, uids):
        return [uids[self.obj.ensemble]]
