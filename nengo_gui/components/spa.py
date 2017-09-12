import copy
import itertools

import numpy as np
import nengo
from nengo.spa import Buffer, Memory, State

from ..client import bind
from .base import Widget


class SpaWidget(Widget):
    def __init__(self, client, obj, uid,
                 target="default", show_pairs=False, pos=None, label=None):
        super(SpaWidget, self).__init__(client, obj, uid, pos, label)

        self.target = target
        # TODO: obj.obj?
        self.vocab = self.obj.obj.outputs[self.target][1]

        self.data = None  # Set in show_pairs
        self.show_pairs = show_pairs

    @property
    def keys(self):
        if self.show_pairs:
            # TODO: is this needed?
            # while self.vocab.key_pairs is None:
            #     time.sleep(0.001)
            return self.vocab.keys + self.vocab.key_pairs
        else:
            return self.vocab.keys

    @property
    def show_pairs(self):
        return self.vocab.include_pairs

    @show_pairs.setter
    @bind("{self.uid}.show_pairs")
    def show_pairs(self, val):
        if val != self.vocab.include_pairs:
            self.vocab.include_pairs = val
            self.client.send("%s.set_keys" % self.uid, keys=self.keys)
            self.data = np.zeros(self.n_lines + 1)


class SpaSimilarity(Widget):
    """Line graph showing semantic pointer decoded values over time"""

    def __init__(self, client, obj, uid,
                 ylim=(-1.5, 1.5), target="default", show_pairs=False,
                 pos=None, label=None):
        super(SpaSimilarity, self).__init__(
            client, obj, uid, target, show_pairs, pos, label)

        # Nengo objects for data collection
        self.node = None
        self.conn = None

    @property
    def n_lines(self):
        return len(self.keys)

    def add_nengo_objects(self, model):

        last_n_lines = 0

        def fast_send_to_client(t, x):
            global last_n_lines
            if self.n_lines != last_n_lines:
                self.update()
            last_n_lines = self.n_lines
            n_keys = len(self.vocab.keys)

            self.data[0] = t
            self.data[1:1+n_keys] = np.dot(self.vocab.vectors, x)
            if self.show_pairs:
                self.data[1+n_keys:] = np.dot(self.vocab.vector_pairs, x)
            self.fast_client.send(self.data)

        with model:
            output = self.obj.obj.outputs[self.target][0]
            self.node = nengo.Node(
                fast_send_to_client, size_in=self.vocab.dimensions)
            self.conn = nengo.Connection(output, self.node, synapse=0.01)

    def remove_nengo_objects(self, model):
        """Undo the changes made by add_nengo_objects."""
        model.connections.remove(self.conn)
        model.nodes.remove(self.node)

    def create(self):
        # TODO: get n_lines from this.labels.length
        self.client.send("create_spa_similarity",
                         uid=self.uid, label=self.label, keys=self.keys)

    def update(self):
        self.client.send("%s.reset_legend_and_data" % self.uid,
                         keys=self.keys)

        # TODO: figure out what update_legend was doing

        # # pass all the missing keys
        # legend_update = []
        # legend_update += (vocab.keys[self.old_vocab_length:])
        # self.old_vocab_length = len(vocab.keys)
        # # and all the missing pairs if we're showing pairs
        # if self.config.show_pairs:
        #     # briefly there can be no pairs, so catch the error
        #     try:
        #         legend_update += vocab.key_pairs[self.old_pairs_length:]
        #         self.old_pairs_length = len(vocab.key_pairs)
        #     except TypeError:
        #         pass

        # self.data.append(
        #     '["update_legend", "%s"]' % ('","'.join(legend_update)))


class SpaPointer(SpaWidget):
    """Server side component for the Semantic Pointer Cloud"""

    # This white list indicates the networks whose user-defined
    # over-ride value can be inserted on the input
    # thus the value loops in from the output to the input.
    # All other networks have their value inserted on the output.
    # Looping-in has the advantage of actually changing the
    # neural activity of the population, rather than just changing
    # the output.
    CAN_LOOP_IN = [Buffer, Memory, State]

    def __init__(self, client, obj, uid,
                 target="default", show_pairs=False, pos=None, label=None):
        super(SpaPointer, self).__init__(
            client, obj, uid, target, show_pairs, pos, label)

        # the semantic pointer value as set by the user in the GUI
        # a value of 'None' means do not override
        self.override_target = None

        self.node = None
        self.conn1 = None
        self.conn2 = None

    def add_nengo_objects(self, network, config):

        def send_to_client(t, x):

            def _matches(vectors, keys):
                similarities = np.dot(vectors, x)
                over_threshold = similarities > 0.01
                return zip(similarities[over_threshold],
                           np.array(keys)[over_threshold])

            matches = _matches(self.vocab.vectors, self.vocab.keys)
            if self.show_pairs:
                matches = itertools.chain(matches, _matches(
                    self.vocab.vector_pairs, self.vocab.key_pairs))

            self.client.send("%s.matches", data=';'.join(
                ['%0.2f%s' % (min(sim, 9.99), key) for sim, key in matches]))

            if self.override_target is None:
                return np.zeros(self.vocab.dimensions)
            else:
                return (self.override_target.v - x) * 3

        with network:
            output = self.obj.obj.outputs[self.target][0]
            self.node = nengo.Node(send_to_client,
                                   size_in=self.vocab.dimensions,
                                   size_out=self.vocab.dimensions)
            self.conn1 = nengo.Connection(output, self.node, synapse=0.01)
            loop_in = type(self.obj.obj) in self.CAN_LOOP_IN
            if loop_in and self.target == 'default':
                input = self.obj.inputs[self.target][0]
                self.conn2 = nengo.Connection(self.node, input, synapse=0.01)
            else:
                self.conn2 = nengo.Connection(self.node, output, synapse=0.01)

    def remove_nengo_objects(self, model):
        model.connections.remove(self.conn1)
        model.connections.remove(self.conn2)
        model.nodes.remove(self.node)

    def create(self):
        self.client.send("create_spa_pointer",
                         uid=self.uid, label=self.label)

    # def code_python_args(self, uids):
    #     return [uids[self.obj], 'target=%r' % self.target]

    @bind("{self.uid}.check_target")
    def check_target(self, target):
        vocab = copy.deepcopy(self.vocab)
        try:
            vocab.parse(target)
            self.client.send("%s.check_target", ok=True)
        except:
            self.client.send("%s.check_target", ok=False)

    @bind("{self.uid}.set_target")
    def set_target(self, target=None):
        if target is not None:
            # Add the target to the vocab is not yet present
            target = self.vocab.parse(target)
        self.override_target = target
