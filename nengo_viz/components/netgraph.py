import time
import struct

import numpy as np
import nengo
import json

from nengo_viz.components.component import Component

class Config(nengo.Config):
    def __init__(self):
        super(Config, self).__init__()
        for cls in [nengo.Ensemble, nengo.Node]:
            self.configures(cls)
            self[cls].set_param('pos', nengo.params.Parameter(None))
            self[cls].set_param('size', nengo.params.Parameter(None))
        self.configures(nengo.Network)
        self[nengo.Network].set_param('pos', nengo.params.Parameter(None))
        self[nengo.Network].set_param('size', nengo.params.Parameter(None))
        self[nengo.Network].set_param('expanded', nengo.params.Parameter(False))


class NetGraph(Component):
    def __init__(self, viz, config=None):
        super(NetGraph, self).__init__(viz)
        self.viz = viz
        if config is None:
            config = Config()
        self.config = config
        self.to_be_expanded = [self.viz.model]

    def update_client(self, client):
        if len(self.to_be_expanded) > 0:
            self.viz.viz.lock.acquire()
            self.expand_network(self.to_be_expanded.pop(0), client)
            self.viz.viz.lock.release()
        else:
            pass

    def javascript(self):
        return 'new VIZ.NetGraph({parent:main, id:%(id)d});' % dict(id=id(self))

    def message(self, msg):
        print 'received', msg

    def expand_network(self, network, client):
        for ens in network.ensembles:
            self.create_object(client, ens, type='ens')
        for node in network.nodes:
            self.create_object(client, node, type='node')
        for net in network.networks:
            self.create_object(client, net, type='net')
        for conn in network.connections:
            self.create_connection(client, conn)
        self.config[network].expanded = True

    def create_object(self, client, obj, type):
        pos = self.config[obj].pos
        if pos is None:
            import random
            pos = random.uniform(0, 1), random.uniform(0, 1)
        size = self.config[obj].size
        if size is None:
            size = (0.04, 0.04)
        label = self.viz.viz.get_label(obj)
        uid = self.viz.viz.get_uid(obj)
        info = dict(uid=uid, label=label, pos=pos, type=type, size=size)
        client.write(json.dumps(info))

    def create_connection(self, client, conn):
        pre = self.viz.viz.get_uid(conn.pre_obj)
        post = self.viz.viz.get_uid(conn.post_obj)
        uid = 'conn_%d' % id(conn)
        info = dict(uid=uid, pre=pre, post=post, type='conn')
        client.write(json.dumps(info))



