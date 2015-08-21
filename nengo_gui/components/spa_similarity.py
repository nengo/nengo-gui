from .pointer import Pointer
from nengo_gui.components.component import Component

import numpy as np
import nengo

import struct
import copy

import ipdb

class SpaSimilarity(Pointer):

    config_defaults = dict(max_value=1,
                           min_value=-1,
                           show_pairs=False,
                           **Component.config_defaults)

    def __init__(self, obj, **kwargs):
        super(SpaSimilarity, self).__init__(obj, **kwargs)
        try:
            target_key = kwargs['target']
        except KeyError:
            target_key = kwargs['args']

        self.old_vocab_length = len(self.vocab_out.keys)
        self.old_pairs_length = 0
        self.labels = self.vocab_out.keys
        self.previous_pairs = False

    def gather_data(self, t, x):
        vocab = self.vocab_out

        # if there's been a change in the show_pairs
        # Don't know how I feel about the timing of this
        # maybe trigger on_message?
        if self.config.show_pairs != self.previous_pairs:
            #send the new labels
            if self.config.show_pairs:
                vocab.include_pairs = True
                self.data.append(
                    '["show_pairs_toggle", "%s"]' %(
                        '","'.join(vocab.keys + vocab.key_pairs)))
                # if we're starting to show pairs, track pair length
                self.old_pairs_length = len(vocab.key_pairs)
            else:
                # Hmmm... an OH HELL NO was triggered...
                vocab.include_pairs = False
                self.data.append(
                    '["show_pairs_toggle", "%s"]' %(
                        '","'.join(vocab.keys)))

        if(self.old_vocab_length != len(vocab.keys)):
            # pass all the missing keys
            legend_update = []
            legend_update.append(vocab.keys[-1])
            self.old_vocab_length = len(vocab.keys)
            # and all the missing pairs if we're showing pairs
            if self.config.show_pairs:
                legend_update += vocab.key_pairs[self.old_pairs_length:]
                self.old_pairs_length = len(vocab.key_pairs)

            self.data.append('["update_legend", "%s"]' %('","'.join(legend_update)))

        # get the similarity and send it
        key_similarity = np.dot(vocab.vectors, x)
        simi_list = ['{:.2f}'.format(simi) for simi in key_similarity]
        if self.config.show_pairs:
            pair_similarity = np.dot(vocab.vector_pairs, x)
            simi_list += ['{:.2f}'.format(simi) for simi in pair_similarity]

        self.data.append( '["data_msg", %g, %s]' %(t, ",".join(simi_list) )  )
        self.previous_pairs = self.config.show_pairs

    def update_client(self, client):
        # while there is data that should be sent to the client
        while len(self.data) > 0:
            item = self.data.popleft()
            # send the data to the client
            client.write(item, binary=False)

    def javascript(self):
        """Almost identical to value.py"""
        info = dict(uid=id(self), label=self.label, n_lines=len(self.labels),
                    synapse=0, min_value=-1.5, max_value=1.5,
                    pointer_labels=self.labels)
        json = self.javascript_config(info)
        return 'new Nengo.SpaSimilarity(main, sim, %s);' % json

    def add_nengo_objects(self, page):
        with page.model:
            output = self.obj.outputs[self.target][0]
            self.node = nengo.Node(self.gather_data,
                                   size_in=self.vocab_out.dimensions)
            self.conn = nengo.Connection(output, self.node, synapse=0.01)

    def remove_nengo_objects(self, page):
        """Undo the changes made by add_nengo_objects."""
        page.model.connections.remove(self.conn)
        page.model.nodes.remove(self.node)

    def message(self, msg):
        """This should never be called. To be used later for settings pairs?"""
        raise AttributeError("You can't set the value of a plot!")
