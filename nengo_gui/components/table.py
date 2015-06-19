import numpy as np
import struct
import collections
import json
import random
import time
import nengo

from nengo_gui.components.component import Component, Template

class Table(Component):
    def __init__(self, viz, config, uid, node):
        super(Table, self).__init__(viz, config, uid)
        self.node = node
        self.label = viz.viz.get_label(node)
        self.value = np.zeros(node.size_out)
        self.column_labels = node.column_labels
        self.row_labels = node.row_labels
        self.certainty = [0] * len(self.column_labels) * len(self.row_labels)
        self.inform_certainty = True
        self.target_cell = 0 #0 indexed

    def add_nengo_objects(self, viz):
        with viz.model:
            self.food = nengo.Node(self.gather_data,
                                   size_in=self.node.size_out)
            self.conn = nengo.Connection(self.node, self.food, synapse=None)

    def remove_nengo_objects(self, viz):
        viz.model.connections.remove(self.conn)
        viz.model.nodes.remove(self.food)

    def gather_data(self, t, x):
        #print(list(x))
        self.change_certainty(list(x[:-1]))
        cell = int(round(x[-1]))
        #row = cell % len(self.row_labels)
        #col = cell / len(self.row_labels)
        self.target_cell = cell

    def override_output(self, t, *args):
        return self.value

    def javascript(self):
        info = dict(uid=self.uid, label=self.label, rows=self.row_labels, columns=self.column_labels, target_cell=self.target_cell)
        json = self.javascript_config(info)
        return 'new Nengo.Table(main, sim, %s);' % json

    def update_client(self, client):      
        if self.inform_certainty:
            client.write(json.dumps(dict(tag='certainty', data=self.certainty, target_cell=self.target_cell)))
            self.inform_certainty = False


    def change_certainty(self, new_certainty_array):
        self.certainty = new_certainty_array
        self.inform_certainty = True

    def message(self, msg):
        print(msg)


class TableTemplate(Template):
    cls = Table
    config_params = dict( **Template.default_params)
