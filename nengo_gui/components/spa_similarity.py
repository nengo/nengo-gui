from pointer import Pointer

import sys
from IPython.core import ultratb
sys.excepthook = ultratb.FormattedTB(mode='Verbose',
     color_scheme='Linux', call_pdb=1)

import ipdb

class SpaSimilarity(Pointer):

    def __init__(self, obj, **kwargs):
        super(SpaSimilarity, self).__init__(obj, **kwargs)
        # I'll eventually have to learn how to switch from showing pairs
        # Probably by rebuilding the whole graph
        try:
            target_key = kwargs['target']
        except KeyError:
            target_key = kwargs['args']

        self.n_lines = len(obj.outputs[target_key][1].keys)

        self.struct = struct.Struct('<%df' % (1 + self.n_lines))

    def format_data(self, matches):
        self.data.append(self.struct.pack(matches.keys))

    def update_client(self, client):
        # while there is data that should be sent to the client
        while len(self.data) > 0:
            item = self.data.popleft()
            # send the data to the client
            client.write(item, binary=True)

    def javascript(self):
        """Almost identical to value.py"""
        info = dict(uid=id(self), label=self.label,
                    n_keys=self.n_lines, synapse=0, min_value=-1.5, max_value=1.5, labels=self.labels)
        json = self.javascript_config(info)
        return 'new Nengo.SpaSimilarity(main, sim, %s);' % json

    def message(self, msg):
        """This should never be called."""
        raise AttributeError("You can't set the value of a plot!")