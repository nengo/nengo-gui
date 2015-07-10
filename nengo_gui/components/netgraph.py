import time
import os
import traceback
import collections
import threading

import nengo
import json

from nengo_gui.components.component import Component, Template
from nengo_gui.disposable_js import infomodal
import nengo_gui.layout

from .action import create_action


class NetGraph(Component):
    configs = {}

    def __init__(self, sim, config, uid):
        # this component must be before all the normal graphs (so that
        # those other graphs are on top of the NetGraph), so its
        # order is between that of SimControl and the default (0)
        super(NetGraph, self).__init__(sim, config, uid, component_order=-5)
        self.sim = sim
        self.layout = nengo_gui.layout.Layout(self.sim.model)
        self.to_be_expanded = collections.deque([self.sim.model])
        self.to_be_sent = collections.deque()

        # this lock ensures safety between check_for_reload() and update_code()
        self.code_lock = threading.Lock()
        self.new_code = None

        self.uids = {}
        self.parents = {}
        self.networks_to_search = [self.sim.model]
        self.initialized_pan_and_zoom = False

        try:
            self.last_modify_time = os.path.getmtime(self.sim.filename)
        except OSError:
            self.last_modify_time = None
        except TypeError:  # happens if self.filename is None
            self.last_modify_time = None
        self.last_reload_check = time.time()

    def check_for_reload(self):
        if self.sim.filename is not None:
            try:
                t = os.path.getmtime(self.sim.filename)
                if self.last_modify_time is None or self.last_modify_time < t:
                    self.reload()
                    self.last_modify_time = t
            except OSError:
                pass

        with self.code_lock:
            new_code = self.new_code
            # the lock is in case update_code() is called between these lines
            self.new_code = None

        if new_code is not None:
            self.reload(code=new_code)

    def update_code(self, code):
        """Set new version of code to display."""
        with self.code_lock:
            self.new_code = code

    def reload(self, code=None):
        with self.sim.lock:
            self._reload(code=code)

    def _reload(self, code=None):

        old_locals = self.sim.locals

        if code is None:
            with open(self.sim.filename) as f:
                code = f.read()
            if self.sim.code == code:
                # don't re-execute the identical code
                return
            else:
                # send the new code to the client
                self.sim.ace_editor.update_code(code)

        self.sim.execute(code)

        if self.sim.error is not None:
            return

        name_finder = nengo_gui.NameFinder(self.sim.locals, self.sim.model)

        self.networks_to_search = [self.sim.model]
        self.parents = {}

        removed_uids = {}

        # for each item in the old model, find the matching new item
        # for Nodes, Ensembles, and Networks, this means to find the item
        # with the same uid.  For Connections, we don't really have a uid,
        # so we use the uids of the pre and post objects.
        for uid, old_item in nengo.utils.compat.iteritems(dict(self.uids)):
            try:
                new_item = eval(uid, self.sim.locals)
            except:
                new_item = None

            # check to make sure the new item's uid is the same as the
            # old item.  This is to catch situations where an old uid
            # happens to still refer to something in the new model, but that's
            # not the normal uid for that item.  For example, the uid
            # "ensembles[0]" might still refer to something even after that
            # ensemble is removed.
            new_uid = self.sim.get_uid(new_item,
                        default_labels=name_finder.known_name)
            if new_uid != uid:
                new_item = None

            # find reasons to delete the object.  Any deleted object will
            # be recreated, so try to keep this to a minimum
            keep_object = True
            if new_item is None:
                keep_object = False
            elif not isinstance(new_item, old_item.__class__):
                # don't allow changing classes
                keep_object = False
            elif isinstance(new_item, nengo.Node):
                # check if a Node has become a passthrough Node
                if old_item.output is None and new_item.output is not None:
                    keep_object = False
                elif old_item.output is not None and new_item.output is None:
                    keep_object = False

            if not keep_object:
                self.to_be_sent.append(dict(
                    type='remove', uid=uid))
                del self.uids[uid]
                removed_uids[old_item] = uid
            else:
                # fix aspects of the item that may have changed
                self._reload_update_item(uid, old_item, new_item, name_finder)

                self.uids[uid] = new_item

        self.to_be_expanded.append(self.sim.model)

        # record the names of the current templates so we can map them to
        # the new templates below.  Note that we have to do this before
        # updating name_finder and config, as that will wipe out the old
        # uids.
        template_uids = [self.sim.get_uid(c.template)
                         for c in self.sim.components]

        self.sim.name_finder = name_finder
        self.sim.default_labels = name_finder.known_name
        self.sim.config = self.sim.load_config()
        self.sim.uid_prefix_counter = {}
        self.layout = nengo_gui.layout.Layout(self.sim.model)
        self.sim.code = code

        removed_items = list(removed_uids.keys())
        for c in self.sim.components:
            for item in c.template.args:
                if item in removed_items:
                    self.to_be_sent.append(dict(type='delete_graph',
                                                uid=c.uid))
                    break

        components = []

        for k, v in list(self.sim.locals.items()):
            if isinstance(v, nengo_gui.components.component.Template):
                t_uid = self.sim.get_uid(v)
                # find the corresponding template in the old list
                index = template_uids.index(t_uid)
                old_component = self.sim.components[index]
                self.sim.locals[t_uid] = v
                self.sim.default_labels[v] = t_uid

                if isinstance(v, (nengo_gui.components.SimControlTemplate,
                                  nengo_gui.components.AceEditorTemplate,
                                  nengo_gui.components.NetGraphTemplate)):
                    old_component.template = v
                    components.append(old_component)

                else:
                    try:
                        c = self.sim.add_template(v)
                        old_component.replace_with = c
                    except:
                        traceback.print_exc()
                        print('failed to recreate plot for %s' % v)
                    components.append(c)

        components.sort(key=lambda x: x.component_order)

        self.sim.components = components

        self.sim.changed = True

    def _reload_update_item(self, uid, old_item, new_item, new_name_finder):
        """Tell the client about changes to the item due to reload."""
        if isinstance(old_item, (nengo.Node,
                                 nengo.Ensemble,
                                 nengo.Network)):
            old_label = self.sim.get_label(old_item)
            new_label = self.sim.get_label(
                new_item, default_labels=new_name_finder.known_name)

            if old_label != new_label:
                self.to_be_sent.append(dict(
                    type='rename', uid=uid, name=new_label))
            if isinstance(old_item, nengo.Network):
                if self.sim.config[old_item].expanded:
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

            old_pre = self.sim.get_uid(old_pre)
            old_post = self.sim.get_uid(old_post)
            new_pre = self.sim.get_uid(
                new_pre, default_labels=new_name_finder.known_name)
            new_post = self.sim.get_uid(
                new_post, default_labels=new_name_finder.known_name)

            if new_pre != old_pre or new_post != old_post:
                # if the connection has changed, tell javascript
                pres = self.get_parents(
                    new_pre,
                    default_labels=new_name_finder.known_name)[:-1]
                posts = self.get_parents(
                    new_post,
                    default_labels=new_name_finder.known_name)[:-1]
                self.to_be_sent.append(dict(
                    type='reconnect', uid=uid,
                    pres=pres, posts=posts))

    def get_parents(self, uid, default_labels=None):
        while uid not in self.parents:
            net = self.networks_to_search.pop(0)
            net_uid = self.sim.get_uid(net, default_labels=default_labels)
            for n in net.nodes:
                n_uid = self.sim.get_uid(n, default_labels=default_labels)
                self.parents[n_uid] = net_uid
            for e in net.ensembles:
                e_uid = self.sim.get_uid(e, default_labels=default_labels)
                self.parents[e_uid] = net_uid
            for n in net.networks:
                n_uid = self.sim.get_uid(n, default_labels=default_labels)
                self.parents[n_uid] = net_uid
                self.networks_to_search.append(n)
        parents = [uid]
        while parents[-1] in self.parents:
            parents.append(self.parents[parents[-1]])
        return parents

    def modified_config(self):
        self.sim.modified_config()

    def update_client(self, client):
        now = time.time()
        if now > self.last_reload_check + 0.5:
            self.check_for_reload()
            self.last_reload_check = now

        if not self.initialized_pan_and_zoom:
            self.send_pan_and_zoom(client)
            self.initialized_pan_and_zoom = True

        while len(self.to_be_sent) > 0:
            info = self.to_be_sent.popleft()
            client.write(json.dumps(info))

        if len(self.to_be_expanded) > 0:
            with self.sim.lock:
                network = self.to_be_expanded.popleft()
                self.expand_network(network, client)

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
                self.sim.undo_stack.append([act])
                del self.sim.redo_stack[:]
        elif undo is not None:
            if undo == '1':
                self.undo()
            else:
                self.redo()
        else:
            print('received message', msg)

    def undo(self):
        if self.sim.undo_stack:
            action = self.sim.undo_stack.pop()
            re = []
            for act in action:
                act.undo()
                re.insert(0, act)
            self.sim.redo_stack.append(re)

    def redo(self):
        if self.sim.redo_stack:
            action = self.sim.redo_stack.pop()
            un = []
            for act in action:
                act.apply()
                un.insert(0, act)
            self.sim.undo_stack.append(un)

    def act_expand(self, uid):
        net = self.uids[uid]
        self.to_be_expanded.append(net)
        self.sim.config[net].expanded = True
        self.modified_config()

    def act_collapse(self, uid):
        net = self.uids[uid]
        self.sim.config[net].expanded = False
        self.remove_uids(net)
        self.modified_config()

    def remove_uids(self, net):
        for items in [net.ensembles, net.networks, net.nodes, net.connections]:
            for item in items:
                uid = self.sim.get_uid(item)
                if uid in self.uids:
                    del self.uids[uid]
        for n in net.networks:
            self.remove_uids(n)

    def act_pan(self, x, y):
        self.sim.config[self.sim.model].pos = x, y
        self.modified_config()

    def act_zoom(self, scale, x, y):
        self.sim.config[self.sim.model].size = scale, scale
        self.sim.config[self.sim.model].pos = x, y
        self.modified_config()

    def act_create_modal(self, uid, **info):
        js = infomodal(self, uid, **info)
        self.to_be_sent.append(dict(type='js', code=js))

    def expand_network(self, network, client):
        if not self.sim.config[network].has_layout:
            pos = self.layout.make_layout(network)
            for obj, layout in pos.items():
                self.sim.config[obj].pos = layout['y'], layout['x']
                self.sim.config[obj].size = layout['h'] / 2, layout['w'] / 2
            self.sim.config[network].has_layout = True

        if network is self.sim.model:
            parent = None
        else:
            parent = self.sim.get_uid(network)
        for ens in network.ensembles:
            self.create_object(client, ens, type='ens', parent=parent)
        for node in network.nodes:
            self.create_object(client, node, type='node', parent=parent)
        for net in network.networks:
            self.create_object(client, net, type='net', parent=parent)
        for conn in network.connections:
            self.create_connection(client, conn, parent=parent)
        self.sim.config[network].expanded = True

    def create_object(self, client, obj, type, parent):
        uid = self.sim.get_uid(obj)
        if uid in self.uids:
            return

        pos = self.sim.config[obj].pos
        if pos is None:
            import random
            pos = random.uniform(0, 1), random.uniform(0, 1)
            self.sim.config[obj].pos = pos
        size = self.sim.config[obj].size
        if size is None:
            size = (0.1, 0.1)
            self.sim.config[obj].size = size
        label = self.sim.get_label(obj)
        self.uids[uid] = obj
        info = dict(uid=uid, label=label, pos=pos, type=type, size=size,
                    parent=parent)
        if type == 'net':
            info['expanded'] = self.sim.config[obj].expanded
        if type == 'node' and obj.output is None:
            info['passthrough'] = True
        if type == 'ens' or type == 'node':
            info['dimensions'] = int(obj.size_out)

        info['sp_targets'] = (
            nengo_gui.components.pointer.Pointer.applicable_targets(obj))

        client.write(json.dumps(info))

    def send_pan_and_zoom(self, client):
        pan = self.sim.config[self.sim.model].pos
        if pan is None:
            pan = 0, 0
        zoom = self.sim.config[self.sim.model].size
        if zoom is None:
            zoom = 1.0
        else:
            zoom = zoom[0]
        client.write(json.dumps(dict(type='pan', pan=pan)))
        client.write(json.dumps(dict(type='zoom', zoom=zoom)))

    def create_connection(self, client, conn, parent):
        uid = self.sim.get_uid(conn)
        if uid in self.uids:
            return
        pre = conn.pre_obj
        if isinstance(pre, nengo.ensemble.Neurons):
            pre = pre.ensemble
        post = conn.post_obj
        if isinstance(post, nengo.ensemble.Neurons):
            post = post.ensemble
        pre = self.sim.get_uid(pre)
        post = self.sim.get_uid(post)
        self.uids[uid] = conn
        pres = self.get_parents(pre)[:-1]
        posts = self.get_parents(post)[:-1]
        info = dict(uid=uid, pre=pres, post=posts, type='conn', parent=parent)
        client.write(json.dumps(info))


class NetGraphTemplate(Template):
    cls = NetGraph
    config_params = dict()
