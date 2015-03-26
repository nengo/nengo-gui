import time
import struct

import numpy as np
import nengo
import json

from nengo_viz.components.component import Component
import nengo_viz.layout

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
        self[nengo.Network].set_param('has_layout', nengo.params.Parameter(False))

    def dumps(self, uids, model):
        lines = []
        lines.append('config[model].pos=%s' % (self[model].pos,))
        lines.append('config[model].size=%s' % (self[model].size,))
        lines.append('config[model].has_layout=%s' % (self[model].has_layout,))
        for uid, obj in sorted(uids.items()):
            if isinstance(obj, nengo.Ensemble):
                lines.append('config[%s].pos=%s' % (uid, self[obj].pos))
                lines.append('config[%s].size=%s' % (uid, self[obj].size))
            elif isinstance(obj, nengo.Node):
                lines.append('config[%s].pos=%s' % (uid, self[obj].pos))
                lines.append('config[%s].size=%s' % (uid, self[obj].size))
            elif isinstance(obj, nengo.Network):
                lines.append('config[%s].pos=%s' % (uid, self[obj].pos))
                lines.append('config[%s].size=%s' % (uid, self[obj].size))
                lines.append('config[%s].expanded=%s' % (uid, self[obj].expanded))
                lines.append('config[%s].has_layout=%s' % (uid, self[obj].has_layout))
        return '\n'.join(lines)

class NetGraph(Component):
    configs = {}

    def __init__(self, viz, config=None):
        super(NetGraph, self).__init__(viz)
        self.viz = viz
        self.layout = nengo_viz.layout.Layout(self.viz.model)
        if config is None:
            config = self.find_config()
        self.config = config
        self.to_be_expanded = [self.viz.model]
        self.uids = {}
        self.parents = {}
        self.networks_to_search = [self.viz.model]

    def save_config(self):
        filename = self.viz.viz.filename
        with open(filename + '.cfg', 'w') as f:
            f.write(self.config.dumps(self.uids, model=self.viz.model))

    def get_parents(self, uid):
        while uid not in self.parents:
            net = self.networks_to_search.pop(0)
            net_uid = self.viz.viz.get_uid(net)
            for n in net.nodes:
                n_uid = self.viz.viz.get_uid(n)
                self.parents[n_uid] = net_uid
            for e in net.ensembles:
                e_uid = self.viz.viz.get_uid(e)
                self.parents[e_uid] = net_uid
            for n in net.networks:
                n_uid = self.viz.viz.get_uid(n)
                self.parents[n_uid] = net_uid
                self.networks_to_search.append(n)
        parents = [uid]
        while parents[-1] in self.parents:
            parents.append(self.parents[parents[-1]])
        return parents

    def find_config(self):
        if self.viz.viz.filename is not None:
            locals = dict(self.viz.viz.locals)
            locals['config'] = Config()
            config = locals['config']
            config[self.viz.model].pos = (0, 0)
            config[self.viz.model].size = 1.0, 1.0
            try:
                with open(self.viz.viz.filename + '.cfg') as f:
                    config_code = f.readlines()
                for line in config_code:
                    try:
                        exec line in locals
                    except Exception as e:
                        print('error parsing config', line)
                        print(e)
            except IOError:
                pass
        else:
            config = NetGraph.configs.get(self.viz.model, None)
            if config is None:
                config = Config()
                NetGraph.configs[self.viz.model] = config
                config[self.viz.model].pos = (0, 0)
                config[self.viz.model].size = 1.0, 1.0
        return config

    def update_client(self, client):
        if len(self.to_be_expanded) > 0:
            self.viz.viz.lock.acquire()
            network = self.to_be_expanded.pop(0)
            self.expand_network(network, client)
            if network is self.viz.model:
                self.send_pan_and_zoom(client)
            self.viz.viz.lock.release()
        else:
            pass

    def javascript(self):
        return 'new VIZ.NetGraph({parent:main, id:%(id)d});' % dict(id=id(self))

    def message(self, msg):
        try:
            info = json.loads(msg)
        except ValueError:
            print 'invalid message', `msg`
            return
        action = info.get('act', None)
        if action is not None:
            del info['act']
            getattr(self, 'act_' + action)(**info)
        else:
            print('received message', msg)

    def act_expand(self, uid):
        net = self.uids[uid]
        self.to_be_expanded.append(net)
        self.config[net].expanded = True
        self.save_config()

    def act_collapse(self, uid):
        net = self.uids[uid]
        self.config[net].expanded = False
        self.save_config()

    def act_pan(self, x, y):
        self.config[self.viz.model].pos = x, y
        self.save_config()

    def act_zoom(self, scale, x, y):
        self.config[self.viz.model].size = scale, scale
        self.config[self.viz.model].pos = x, y
        self.save_config()

    def act_pos(self, uid, x, y):
        obj = self.uids[uid]
        self.config[obj].pos = x, y
        self.save_config()

    def act_size(self, uid, width, height):
        obj = self.uids[uid]
        self.config[obj].size = width, height
        self.save_config()

    def act_pos_size(self, uid, x, y, width, height):
        obj = self.uids[uid]
        self.config[obj].pos = x, y
        self.config[obj].size = width, height
        self.save_config()

    def expand_network(self, network, client):
        if not self.config[network].has_layout:
            pos = self.layout.make_layout(network)
            for obj, layout in pos.items():
                self.config[obj].pos = layout['y'], layout['x']
                self.config[obj].size = layout['h'] / 2, layout['w'] / 2
            self.config[network].has_layout = True

        if network is self.viz.model:
            parent = None
        else:
            parent = self.viz.viz.get_uid(network)
        for ens in network.ensembles:
            self.create_object(client, ens, type='ens', parent=parent)
        for node in network.nodes:
            self.create_object(client, node, type='node', parent=parent)
        for net in network.networks:
            self.create_object(client, net, type='net', parent=parent)
        for conn in network.connections:
            self.create_connection(client, conn, parent=parent)
        self.config[network].expanded = True

    def create_object(self, client, obj, type, parent):
        pos = self.config[obj].pos
        if pos is None:
            import random
            pos = random.uniform(0, 1), random.uniform(0, 1)
            self.config[obj].pos = pos
        size = self.config[obj].size
        if size is None:
            size = (0.1, 0.1)
            self.config[obj].size = size
        label = self.viz.viz.get_label(obj)
        uid = self.viz.viz.get_uid(obj)
        self.uids[uid] = obj
        info = dict(uid=uid, label=label, pos=pos, type=type, size=size,
                    parent=parent)
        if type == 'net':
            info['expanded'] = self.config[obj].expanded
        client.write(json.dumps(info))

    def send_pan_and_zoom(self, client):
        pan = self.config[self.viz.model].pos
        if pan is None:
            pan = 0, 0
        zoom = self.config[self.viz.model].size
        if zoom is None:
            zoom = 1.0
        else:
            zoom = zoom[0]
        client.write(json.dumps(dict(type='pan', pan=pan)))
        client.write(json.dumps(dict(type='zoom', zoom=zoom)))

    def create_connection(self, client, conn, parent):
        pre = conn.pre_obj
        if isinstance(pre, nengo.ensemble.Neurons):
            pre = pre.ensemble
        post = conn.post_obj
        if isinstance(post, nengo.ensemble.Neurons):
            post = post.ensemble
        pre = self.viz.viz.get_uid(pre)
        post = self.viz.viz.get_uid(post)
        uid = 'conn_%d' % id(conn)
        self.uids[uid] = conn
        pres = self.get_parents(pre)[:-1]
        posts = self.get_parents(post)[:-1]
        info = dict(uid=uid, pre=pres, post=posts, type='conn', parent=parent)
        client.write(json.dumps(info))



