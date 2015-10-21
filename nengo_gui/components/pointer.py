import collections
import copy

import nengo
import nengo.spa as spa
import numpy as np

from nengo_gui.components.component import Component
from nengo_gui.components.spa_plot import SpaPlot

class Pointer(SpaPlot):
    config_defaults = dict(show_pairs=False, **Component.config_defaults)
    def __init__(self, obj, **kwargs):
        super(Pointer, self).__init__(obj, **kwargs)
        # the semantic pointer value as set by the user in the GUI
        # a value of 'None' means do not override
        self.override_target = None
        loop_in_whitelist = [spa.Buffer, spa.Memory, spa.State, spa.AssociativeMemory]

        if type(obj) in loop_in_whitelist and target == 'default':
            self.vocab_in = obj.inputs[self.target][1]
            self.loop_in = True
            self.size_out = self.vocab_in.dimensions
            self.default_override_val = np.zeroes(self.size_out)
        else:
            self.loop_in = False
            self.size_out = self.vocab_out.dimensions
            self.default_override_val = np.zeroes(self.size_out)

        self.vocab_transform = None
        if self.vocab_in is not self.vocab_out:
            self.vocab_transform = self.vocab_out.transform_to(self.vocab_in)

        self.node = None
        self.conn1 = None
        self.conn2 = None

    def add_nengo_objects(self, page):
        with page.model:
            output = self.obj.outputs[self.target][0]
            self.node = nengo.Node(self.gather_data,
                                   size_in=self.vocab_out.dimensions,
                                   size_out=self.size_out)
            self.conn1 = nengo.Connection(output, self.node, synapse=0.01)
            if self.loop_in:
                input = self.obj.inputs[self.target][0]
                self.conn2 = nengo.Connection(self.node, input, synapse=0.01)
            else:
                self.conn2 = nengo.Connection(self.node, output, synapse=0.01)

    def remove_nengo_objects(self, page):
        page.model.connections.remove(self.conn1)
        page.model.connections.remove(self.conn2)
        page.model.nodes.remove(self.node)

    def gather_data(self, t, x):
        vocab = self.vocab_out
        key_similarities = np.dot(vocab.vectors, x)
        over_threshold = key_similarities > 0.01
        matches = zip(key_similarities[over_threshold], 
                      np.array(vocab.keys)[over_threshold])
        if self.config.show_pairs:
            self.vocab_out.include_pairs = True
            pair_similarities = np.dot(vocab.vector_pairs, x)
            over_threshold = pair_similarities > 0.01
            pair_matches = zip(pair_similarities[over_threshold],
                               np.array(vocab.key_pairs)[over_threshold])
            matches += pair_matches

        text = ';'.join(['%0.2f%s' % (sim, key) for sim, key in matches])

        # msg sent as a string due to variable size of pointer names
        msg = '%g %s' % (t, text)
        self.data.append(msg)
        if self.override_target is None:
            return self.default_override_val
        else:
            v = (self.override_target.v - x) * 3
            if self.loop_in and self.vocab_transform is not None:
                v = np.dot(self.vocab_transform, v)
            return v

    def update_client(self, client):
        while len(self.data) > 0:
            data = self.data.popleft()
            client.write(data, binary=False)

    def javascript(self):
        info = dict(uid=id(self), label=self.label)
        json = self.javascript_config(info)
        return 'new Nengo.Pointer(main, sim, %s);' % json

    def code_python_args(self, uids):
        return [uids[self.obj], 'target=%r' % self.target]

    def message(self, msg):
        if msg == ':empty:':
            self.override_target = None
        elif msg[0:12] == ':check only:':
            if len(msg) == 12:
                self.data.append("good_pointer")
            else:                
                vocab = copy.deepcopy(self.vocab_out)
                try:
                    vocab.parse(msg[12:])
                    self.data.append("good_pointer")
                except:
                    self.data.append("bad_pointer")
        else:
            # The message value is the new value for the output of the pointer
            try:
                self.override_target = self.vocab_out.parse(msg)
            except:
                self.override_target = None
