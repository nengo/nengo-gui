import nengo
import nengo.spa
import numpy as np
import struct

from nengo_viz.components.component import Component


class Pointer(Component):
    def __init__(self, viz, config, uid, obj):
        super(Pointer, self).__init__(viz, config, uid)
        self.obj = obj
        self.label = viz.viz.get_label(obj)
        self.data = []
        self.override_target = None
        self.vocab_out = obj.outputs['default'][1]
        self.vocab_in = obj.inputs['default'][1]
        self.vocab_out.include_pairs = config.show_pairs

    def add_nengo_objects(self, viz):
        with viz.model:
            output  = self.obj.outputs['default'][0]
            input = self.obj.inputs['default'][0]
            self.node = nengo.Node(self.gather_data,
                                   size_in=self.vocab_out.dimensions,
                                   size_out=self.vocab_in.dimensions)
            self.conn1 = nengo.Connection(output, self.node, synapse=0.01)
            self.conn2 = nengo.Connection(self.node, input, synapse=0.01)

    def remove_nengo_objects(self, viz):
        viz.model.connections.remove(self.conn1)
        viz.model.connections.remove(self.conn2)
        viz.model.nodes.remove(self.node)

    def gather_data(self, t, x):
        vocab = self.vocab_out
        m = np.dot(vocab.vectors, x)
        matches = [(mm, vocab.keys[i]) for i, mm in enumerate(m) if mm > 0.01]
        if self.config.show_pairs:
            self.vocab_out.include_pairs = True
            m2 = np.dot(vocab.vector_pairs, x)
            matches2 = [(mm, vocab.key_pairs[i]) for i, mm in enumerate(m2)
                        if mm > 0.01]
            matches += matches2
        text = ';'.join(['%0.2f%s' % (sim, key) for (sim, key) in matches])

        msg = '%g %s' % (t, text)
        self.data.append(msg)
        if self.override_target is None:
            return self.vocab_in.parse('0').v
        else:
            v = (self.override_target.v - x) * 3
            if self.vocab_in is not self.vocab_out:
                v = np.dot(self.vocab_out.transform_to(self.vocab_in), v)
            return v


    def update_client(self, client):
        while len(self.data) > 0:
            data = self.data.pop(0)
            client.write(data, binary=False)

    def javascript(self):
        info = dict(uid=self.uid, label=self.label)
        json = self.javascript_config(info)
        return 'new VIZ.Pointer(main, sim, %s);' % json

    def message(self, msg):
        if len(msg) == 0:
            self.override_target = None
        else:
            try:
                self.override_target = self.vocab_out.parse(msg)
            except:
                self.override_target = None

    @staticmethod
    def can_apply(obj):
        return isinstance(obj, (nengo.spa.Buffer, nengo.spa.Memory))
