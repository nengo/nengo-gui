import time
import os
import traceback
import collections

import nengo
import json

from nengo_gui.components.component import Component, Template
from nengo_gui.disposable_js import infomodal
import nengo_gui.layout

from .action import create_action


class NetGraph(Component):
    configs = {}

    def __init__(self, viz, config, uid):
        super(NetGraph, self).__init__(viz, config, uid)
        self.viz = viz
        self.layout = nengo_gui.layout.Layout(self.viz.model)
        self.config = viz.config
        self.to_be_expanded = collections.deque([self.viz.model])
        self.to_be_sent = collections.deque()
        self.uids = {}
        self.parents = {}
        self.networks_to_search = [self.viz.model]
        self.initialized_pan_and_zoom = False
        try:
            self.last_modify_time = os.path.getmtime(self.viz.viz.filename)
        except OSError:
            self.last_modify_time = None
        self.last_reload_check = time.time()

    def check_for_reload(self):
        try:
            t = os.path.getmtime(self.viz.viz.filename)
        except OSError:
            t = None

        if t is not None:
            if self.last_modify_time is None or self.last_modify_time < t:
                self.reload()
                self.last_modify_time = t

        new_code = self.viz.new_code
        self.viz.new_code = None
        if new_code is not None:
            self.reload(code=new_code)

    def reload(self, code=None):
        with self.viz.viz.lock:
            self._reload(code=code)

    def _reload(self, code=None):
        current_error = None
        locals = {}
        if code is None:
            with open(self.viz.viz.filename) as f:
                code = f.read()

        try:
            exec(code, locals)
        except:
            line = nengo_gui.monkey.determine_line_number()
            current_error = dict(trace=traceback.format_exc(), line=line)
            traceback.print_exc()
            self.viz.current_error = current_error
            return
        try:
            model = locals['model']
        except:
            if current_error is None:
                line = nengo_gui.monkey.determine_line_number()
                current_error = dict(trace=traceback.format_exc(), line=line)
                traceback.print_exc()
            self.viz.current_error = current_error
            return
        self.viz.current_error = current_error

        locals['nengo_gui'] = nengo_gui
        name_finder = nengo_gui.NameFinder(locals, model)

        self.networks_to_search = [model]
        self.parents = {}

        removed_uids = {}

        # for each item in the old model, find the matching new item
        # for Nodes, Ensembles, and Networks, this means to find the item
        # with the same uid.  For Connections, we don't really have a uid,
        # so we use the uids of the pre and post objects.
        for uid, old_item in nengo.utils.compat.iteritems(dict(self.uids)):
            try:
                new_item = eval(uid, locals)
            except:
                new_item = None

            # check to make sure the new item's uid is the same as the
            # old item.  This is to catch situations where an old uid
            # happens to still refer to something in the new model, but that's
            # not the normal uid for that item.  For example, the uid
            # "ensembles[0]" might still refer to something even after that
            # ensemble is removed.
            new_uid = self.viz.viz.get_uid(new_item,
                        default_labels=name_finder.known_name)
            if new_uid != uid:
                new_item = None

            if new_item is None or not isinstance(new_item, old_item.__class__):
                self.to_be_sent.append(dict(
                    type='remove', uid=uid))
                del self.uids[uid]
                removed_uids[old_item] = uid
            elif not isinstance(new_item, old_item.__class__):
                self.to_be_sent.append(dict(
                    type='remove', uid=uid))
                del self.uids[uid]
                removed_uids[old_item] = uid
            else:
                if isinstance(old_item, (nengo.Node,
                                         nengo.Ensemble,
                                         nengo.Network)):
                    old_label = self.viz.viz.get_label(old_item)
                    new_label = self.viz.viz.get_label(
                        new_item, default_labels=name_finder.known_name)

                    if old_label != new_label:
                        self.to_be_sent.append(dict(
                            type='rename', uid=uid, name=new_label))
                    if isinstance(old_item, nengo.Network):
                        if self.viz.viz.config[old_item].expanded:
                            self.to_be_expanded.append(new_item)

                elif isinstance(old_item, nengo.Connection):
                    old_pre = old_item.pre_obj
                    old_post = old_item.post_obj
                    new_pre = new_item.pre_obj
                    new_post = new_item.post_obj
                    if isinstance(old_pre, nengo.ensemble.Neurons):
                        old_pre = old_pre.ensemble
                    if isinstance(old_post, nengo.ensemble.Neurons):
                        old_post = old_post.ensemble
                    if isinstance(new_pre, nengo.ensemble.Neurons):
                        new_pre = new_pre.ensemble
                    if isinstance(new_post, nengo.ensemble.Neurons):
                        new_post = new_post.ensemble

                    old_pre = self.viz.viz.get_uid(old_pre)
                    old_post = self.viz.viz.get_uid(old_post)
                    new_pre = self.viz.viz.get_uid(
                        new_pre, default_labels=name_finder.known_name)
                    new_post = self.viz.viz.get_uid(
                        new_post, default_labels=name_finder.known_name)

                    if new_pre != old_pre or new_post != old_post:
                        # if the connection has changed, tell javascript
                        pres = self.get_parents(
                            new_pre,
                            default_labels=name_finder.known_name)[:-1]
                        posts = self.get_parents(
                            new_post,
                            default_labels=name_finder.known_name)[:-1]
                        self.to_be_sent.append(dict(
                            type='reconnect', uid=uid,
                            pres=pres, posts=posts))

                self.uids[uid] = new_item

        self.to_be_expanded.append(model)

        self.viz.model = model
        self.viz.viz.model = model
        self.viz.viz.locals = locals
        self.viz.viz.name_finder = name_finder
        self.viz.viz.default_labels = name_finder.known_name
        self.viz.viz.config = self.viz.viz.load_config()
        self.viz.config = self.viz.viz.config
        self.config = self.viz.viz.config
        self.viz.viz.uid_prefix_counter = {}
        self.layout = nengo_gui.layout.Layout(model)
        self.viz.viz.code = code


        removed_items = list(removed_uids.keys())
        for c in self.viz.components:
            for item in c.template.args:
                if item in removed_items:
                    self.to_be_sent.append(dict(type='delete_graph',
                                                uid=c.uid))
                    break

        components = []
        for c in self.viz.components[:3]:
            components.append(c)
            locals[c.uid] = c.template
        self.viz.components = components
        for template in self.viz.viz.find_templates():
            if not isinstance(template,
                              (nengo_gui.components.SimControlTemplate,
                               nengo_gui.components.NetGraphTemplate,
                               nengo_gui.components.AceEditorTemplate)):
                self.viz.add_template(template)

        self.viz.changed = True

    def get_parents(self, uid, default_labels=None):
        while uid not in self.parents:
            net = self.networks_to_search.pop(0)
            net_uid = self.viz.viz.get_uid(net, default_labels=default_labels)
            for n in net.nodes:
                n_uid = self.viz.viz.get_uid(n, default_labels=default_labels)
                self.parents[n_uid] = net_uid
            for e in net.ensembles:
                e_uid = self.viz.viz.get_uid(e, default_labels=default_labels)
                self.parents[e_uid] = net_uid
            for n in net.networks:
                n_uid = self.viz.viz.get_uid(n, default_labels=default_labels)
                self.parents[n_uid] = net_uid
                self.networks_to_search.append(n)
        parents = [uid]
        while parents[-1] in self.parents:
            parents.append(self.parents[parents[-1]])
        return parents

    def modified_config(self):
        self.viz.viz.modified_config()

    def update_client(self, client):
        now = time.time()
        if now > self.last_reload_check + 0.5:
            self.check_for_reload()
            self.last_reload_check = now

        if not self.initialized_pan_and_zoom:
            self.send_pan_and_zoom(client)
            self.initialized_pan_and_zoom = True

        if len(self.to_be_expanded) > 0:
            self.viz.viz.lock.acquire()
            network = self.to_be_expanded.popleft()
            self.expand_network(network, client)
            self.viz.viz.lock.release()
        else:
            while len(self.to_be_sent) > 0:
                info = self.to_be_sent.popleft()
                client.write(json.dumps(info))

    def javascript(self):
        return 'new Nengo.NetGraph(main, {uid:"%s"});' % self.uid

    def message(self, msg):
        try:
            info = json.loads(msg)
        except ValueError:
            print('invalid message', repr(msg))
            return
        action = info.get('act', None)
        undo = info.get('undo', None)
        if action is not None:
            del info['act']
            if action in ('auto_expand', 'auto_collapse'):
                getattr(self, 'act_' + action[5:])(**info)
            elif action in ('pan', 'zoom', 'create_modal'):
                # These should not use the undo stack
                getattr(self, 'act_' + action)(**info)
            else:
                act = create_action(action, self, **info)
                self.viz.undo_stack.append([act])
                del self.viz.redo_stack[:]
        elif undo is not None:
            if undo == '1':
                self.undo()
            else:
                self.redo()
        else:
            print('received message', msg)

    def undo(self):
        if self.viz.undo_stack:
            action = self.viz.undo_stack.pop()
            re = []
            for act in action:
                act.undo()
                re.insert(0, act)
            self.viz.redo_stack.append(re)

    def redo(self):
        if self.viz.redo_stack:
            action = self.viz.redo_stack.pop()
            un = []
            for act in action:
                act.apply()
                un.insert(0, act)
            self.viz.undo_stack.append(un)

    def act_expand(self, uid):
        net = self.uids[uid]
        self.to_be_expanded.append(net)
        self.config[net].expanded = True
        self.modified_config()

    def act_collapse(self, uid):
        net = self.uids[uid]
        self.config[net].expanded = False
        self.remove_uids(net)
        self.modified_config()

    def remove_uids(self, net):
        for items in [net.ensembles, net.networks, net.nodes, net.connections]:
            for item in items:
                uid = self.viz.viz.get_uid(item)
                if uid in self.uids:
                    del self.uids[uid]
        for n in net.networks:
            self.remove_uids(n)

    def act_pan(self, x, y):
        self.config[self.viz.model].pos = x, y
        self.modified_config()

    def act_zoom(self, scale, x, y):
        self.config[self.viz.model].size = scale, scale
        self.config[self.viz.model].pos = x, y
        self.modified_config()

    def act_create_modal(self, uid, **info):
        js = infomodal(self, uid, **info)
        self.to_be_sent.append(dict(type='js', code=js))

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
        uid = self.viz.viz.get_uid(obj)
        if uid in self.uids:
            return

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
        self.uids[uid] = obj
        info = dict(uid=uid, label=label, pos=pos, type=type, size=size,
                    parent=parent)
        if type == 'net':
            info['expanded'] = self.config[obj].expanded
        if type == 'node' and obj.output is None:
            info['passthrough'] = True
        if type == 'ens' or type == 'node':
            info['dimensions'] = int(obj.size_out)

        info['sp_targets'] = (
            nengo_gui.components.pointer.Pointer.applicable_targets(obj))

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
        uid = self.viz.viz.get_uid(conn)
        if uid in self.uids:
            return
        pre = conn.pre_obj
        if isinstance(pre, nengo.ensemble.Neurons):
            pre = pre.ensemble
        post = conn.post_obj
        if isinstance(post, nengo.ensemble.Neurons):
            post = post.ensemble
        pre = self.viz.viz.get_uid(pre)
        post = self.viz.viz.get_uid(post)
        self.uids[uid] = conn
        pres = self.get_parents(pre)[:-1]
        posts = self.get_parents(post)[:-1]
        info = dict(uid=uid, pre=pres, post=posts, type='conn', parent=parent)
        client.write(json.dumps(info))


class NetGraphTemplate(Template):
    cls = NetGraph
    config_params = dict()
