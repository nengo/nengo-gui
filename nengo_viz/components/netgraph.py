import time
import struct

import numpy as np
import nengo

from nengo_viz.components.component import Component

class NetGraph(Component):
    def __init__(self, viz):
        super(NetGraph, self).__init__(viz)
        self.viz = viz

    def update_client(self, client):
        print 'update netgraph'

    def javascript(self):
        return 'new VIZ.NetGraph({parent:main, id:%(id)d});' % dict(id=id(self))

    def message(self, msg):
        print 'received', msg
