import numpy as np
import struct
import collections
import json
import random
import time

from nengo_gui.components.component import Component, Template

class Table(Component):
    def __init__(self, viz, config, uid, node):
        super(Table, self).__init__(viz, config, uid)
        self.node = node
        self.label = viz.viz.get_label(node)
        self.value = np.zeros(node.size_out)
        self.column_labels = ['1st column', '2nd column']
        self.row_labels = ['1st row', '2nd row']
        self.certainty = [19,20,50,75]
        self.inform_certainty = True
        self.target_cell = dict(row=1,column=1) #0 indexed

    def add_nengo_objects(self, viz):

        pass

    def remove_nengo_objects(self, viz):
        pass

    def override_output(self, t, *args):
        return self.value

    def javascript(self):
        info = dict(uid=self.uid, label=self.label, rows=self.row_labels, columns=self.column_labels, target_cell=self.target_cell)
        json = self.javascript_config(info)
        return 'new Nengo.Table(main, sim, %s);' % json

    def update_client(self, client):      
        if self.inform_certainty:
            client.write(json.dumps(dict(tag='certainty', data=self.certainty)))
            self.inform_certainty = True

    def change_certainty(self, new_certainty_array):
        self.certainty = new_certainty_array
        self.inform_certainty = True

    def message(self, msg):
        print(msg)


class TableTemplate(Template):
    cls = Table
    config_params = dict( **Template.default_params)
