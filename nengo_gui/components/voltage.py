from __future__ import division

import nengo
import numpy as np
import struct

from nengo_gui.components.component import Component, Template


class Voltage(Component):
    def __init__(self, viz, config, uid, obj, n_neurons=5):
        super(Voltage, self).__init__(viz, config, uid)
        self.viz = viz
        self.obj = obj.neurons
        self.data = []
        self.label = viz.viz.get_label(obj)
        self.max_neurons = int(self.obj.size_out)
        self.n_neurons = min(n_neurons, self.max_neurons)
        self.struct = struct.Struct('<%df' % (1 + self.n_neurons))

    def add_nengo_objects(self, viz):
        with viz.model:
            self.probe = nengo.Probe(self.obj[:self.n_neurons], 'voltage')

    def remove_nengo_objects(self, viz):
        viz.model.probes.remove(self.probe)

    def format_data(self, t, x):
        data = self.struct.pack(t, *x[:self.n_neurons])
        self.data.append(data)

    def update_client(self, client):
        sim = self.viz.sim
        if sim is None:
            return

        # TODO: this is hack to delete probe data in Nengo 2.0.1, since we
        # can't limit the size of probes. Fix this up with Nengo 2.1.
        data = sim.data.raw[self.probe][:]
        del sim.data.raw[self.probe][:]  # clear the data
        trange = sim.trange()[-len(data):]

        for t, datum in zip(trange, data):
            datum = (datum + np.arange(self.n_neurons))
            packet = self.struct.pack(t, *datum)
            client.write(packet, binary=True)

    def javascript(self):
        info = dict(uid=self.uid, label=self.label,
                    n_lines=self.n_neurons, synapse=0)
        json = self.javascript_config(info)
        return 'new Nengo.Value(main, sim, %s);' % json


class VoltageTemplate(Template):
    cls = Voltage
    config_params = dict(
        max_value=5.0, min_value=0.0, **Template.default_params)
