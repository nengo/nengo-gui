import collections
import json
import os
import threading
import time
import traceback

import nengo
import nengo_gui.layout
import nengo_gui.user_action
import numpy as np
from nengo_gui.compat import escape, iteritems
from nengo_gui.components.component import Component
from nengo_gui.components.slider import OverriddenOutput
from nengo_gui.components.value import Value
from nengo_gui.modal_js import infomodal


class NetGraph(Component):
    """Handles computations and communications for NetGraph on the JS side.

    Communicates to all NetGraph components for creation, deletion and
    manipulation.
    """

    config_defaults = {}
    configs = {}

    def __init__(self):
        # this component must be ordered before all the normal graphs (so that
        # other graphs are on top of the NetGraph), so its
        # order is between that of SimControl and the default (0)
        super(NetGraph, self).__init__(component_order=-5)

        # this lock ensures safety between check_for_reload() and update_code()
        self.code_lock = threading.Lock()
        self.new_code = None

        self.uids = {}
        self.parents = {}
        self.initialized_pan_and_zoom = False

    def attach(self, page, config, uid):
        super(NetGraph, self).attach(page, config, uid)
        self.layout = nengo_gui.layout.Layout(self.page.model)
        self.to_be_expanded = collections.deque([self.page.model])
        self.to_be_sent = collections.deque()

        self.networks_to_search = [self.page.model]

        try:
            self.last_modify_time = os.path.getmtime(self.page.filename)
        except OSError:
            self.last_modify_time = None
        except TypeError:  # happens if self.filename is None
            self.last_modify_time = None

        self.last_reload_check = time.time()

    def check_for_reload(self):
        if self.page.filename is not None:
            try:
                t = os.path.getmtime(self.page.filename)
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
        """Called when new code has been detected
        checks that the page is not currently being used
        and thus can be updated"""
        with self.page.lock:
            self._reload(code=code)

    def _reload(self, code=None):  # noqa: C901
        """Loads and executes the code, removing old items,
        updating changed items
        and adding new ones"""

        old_locals = self.page.last_good_locals
        old_default_labels = self.page.default_labels

        if code is None:
            with open(self.page.filename) as f:
                code = f.read()
            if self.page.code == code:
                # don't re-execute the identical code
                return
            else:
                # send the new code to the client
                self.page.editor.update_code(code)

        self.page.execute(code)

        if self.page.error is not None:
            return

        name_finder = nengo_gui.NameFinder(self.page.locals, self.page.model)

        self.networks_to_search = [self.page.model]
        self.parents = {}

        removed_uids = {}
        rebuilt_objects = []

        # for each item in the old model, find the matching new item
        # for Nodes, Ensembles, and Networks, this means to find the item
        # with the same uid.  For Connections, we don't really have a uid,
        # so we use the uids of the pre and post objects.
        for uid, old_item in iteritems(dict(self.uids)):
            try:
                new_item = eval(uid, self.page.locals)
            except:
                new_item = None

            # check to make sure the new item's uid is the same as the
            # old item.  This is to catch situations where an old uid
            # happens to still refer to something in the new model, but that's
            # not the normal uid for that item.  For example, the uid
            # "ensembles[0]" might still refer to something even after that
            # ensemble is removed.
            new_uid = self.page.get_uid(new_item, default_labels=name_finder.known_name)
            if new_uid != uid:
                new_item = None

            same_class = False
            for cls in [nengo.Ensemble, nengo.Node, nengo.Network, nengo.Connection]:
                if isinstance(new_item, cls) and isinstance(old_item, cls):
                    same_class = True
                    break

            # find reasons to delete the object.  Any deleted object will
            # be recreated, so try to keep this to a minimum
            keep_object = True
            if new_item is None:
                keep_object = False
            elif not same_class:
                # don't allow changing classes
                keep_object = False
            elif self.get_extra_info(new_item) != self.get_extra_info(old_item):
                keep_object = False

            if not keep_object:
                self.to_be_sent.append(dict(type="remove", uid=uid))
                del self.uids[uid]
                removed_uids[old_item] = uid
                rebuilt_objects.append(uid)
            else:
                # fix aspects of the item that may have changed
                if self._reload_update_item(uid, old_item, new_item, name_finder):
                    # something has changed about this object, so rebuild
                    # the components that use it
                    rebuilt_objects.append(uid)

                self.uids[uid] = new_item

        self.to_be_expanded.append(self.page.model)

        self.page.name_finder = name_finder
        self.page.default_labels = name_finder.known_name
        self.page.config = self.page.load_config()
        self.page.uid_prefix_counter = {}
        self.layout = nengo_gui.layout.Layout(self.page.model)
        self.page.code = code

        orphan_components = []
        rebuild_components = []

        # items that are shown in components, but not currently displayed
        #  in the NetGraph (i.e. things that are inside collapsed
        #  Networks, but whose values are being shown in a graph)
        collapsed_items = []

        # remove graphs no longer associated to NetgraphItems
        removed_items = list(removed_uids.values())
        for c in self.page.components[:]:
            for item in c.code_python_args(old_default_labels):
                if item not in self.uids.keys() and item not in collapsed_items:

                    # item is a python string that is an argument to the
                    # constructor for the Component.  So it could be 'a',
                    # 'model.ensembles[3]', 'True', or even 'target=a'.
                    # We need to evaluate this string in the context of the
                    # locals dictionary and see what object it refers to
                    # so we can determine whether to rebuild this component.
                    #
                    # The following lambda should do this, handling both
                    # the normal argument case and the keyword argument case.
                    safe_eval = "(lambda *a, **b: " "list(a) + list(b.values()))(%s)[0]"

                    # this Component depends on an item inside a collapsed
                    #  Network, so we need to check if that component has
                    #  changed or been removed
                    old_obj = eval(safe_eval % item, old_locals)

                    try:
                        new_obj = eval(safe_eval % item, self.page.locals)
                    except:
                        # the object this Component depends on no longer exists
                        new_obj = None

                    if new_obj is None:
                        removed_items.append(item)
                    elif not isinstance(new_obj, old_obj.__class__):
                        rebuilt_objects.append(item)
                    elif self.get_extra_info(new_obj) != self.get_extra_info(old_obj):
                        rebuilt_objects.append(item)

                    # add this to the list of collapsed items, so we
                    # don't recheck it if there's another Component that
                    # also depends on this
                    collapsed_items.append(item)

                if item in rebuilt_objects:
                    self.to_be_sent.append(
                        dict(
                            type="delete_graph", uid=c.original_id, notify_server=False
                        )
                    )
                    rebuild_components.append(c.uid)
                    self.page.components.remove(c)
                    break
            else:
                for item in c.code_python_args(old_default_labels):
                    if item in removed_items:
                        self.to_be_sent.append(
                            dict(
                                type="delete_graph",
                                uid=c.original_id,
                                notify_server=False,
                            )
                        )
                        orphan_components.append(c)
                        break

        components = []
        # the old names for the old components
        component_uids = [c.uid for c in self.page.components]

        for name, obj in list(self.page.locals.items()):
            if isinstance(obj, Component):
                # the object has been removed, so the Component should
                #  be removed as well
                if obj in orphan_components:
                    continue

                # this is a Component that was previously removed,
                #  but is still in the config file, or it has to be
                #  rebuilt, so let's recover it
                if name not in component_uids:
                    self.page.add_component(obj)
                    self.to_be_sent.append(dict(type="js", code=obj.javascript()))
                    components.append(obj)
                    continue

                # otherwise, find the corresponding old Component
                index = component_uids.index(name)
                old_component = self.page.components[index]
                if isinstance(
                    obj,
                    (
                        nengo_gui.components.SimControlTemplate,
                        nengo_gui.components.AceEditorTemplate,
                        nengo_gui.components.NetGraphTemplate,
                    ),
                ):
                    # just keep these ones
                    components.append(old_component)
                else:
                    # replace these components with the newly generated ones
                    try:
                        self.page.add_component(obj)
                        old_component.replace_with = obj
                        obj.original_id = old_component.original_id
                    except:
                        traceback.print_exc()
                        print("failed to recreate plot for %s" % obj)
                    components.append(obj)

        components.sort(key=lambda x: x.component_order)

        self.page.components = components

        # notifies SimControl to pause the simulation
        self.page.changed = True

    def _reload_update_item(
        self, uid, old_item, new_item, new_name_finder
    ):  # noqa: C901
        """Tell the client about changes to the item due to reload."""
        changed = False

        if isinstance(old_item, (nengo.Node, nengo.Ensemble, nengo.Network)):

            old_label = self.page.get_label(old_item)
            new_label = self.page.get_label(
                new_item, default_labels=new_name_finder.known_name
            )

            if old_label != new_label:
                self.to_be_sent.append(
                    dict(type="rename", uid=uid, name=escape(new_label))
                )
                changed = True
            if isinstance(old_item, nengo.Network):
                if self.page.config[old_item].expanded:
                    self.to_be_expanded.append(new_item)
                    changed = True

        elif isinstance(old_item, nengo.Connection):
            old_pre = NetGraph.connection_pre_obj(old_item)
            old_post = NetGraph.connection_post_obj(old_item)
            new_pre = NetGraph.connection_pre_obj(new_item)
            new_post = NetGraph.connection_post_obj(new_item)

            old_pre = self.page.get_uid(old_pre)
            old_post = self.page.get_uid(old_post)
            new_pre = self.page.get_uid(
                new_pre, default_labels=new_name_finder.known_name
            )
            new_post = self.page.get_uid(
                new_post, default_labels=new_name_finder.known_name
            )

            if new_pre != old_pre or new_post != old_post:
                # if the connection has changed, tell javascript
                pres, posts = self.get_connection_hierarchy(
                    new_item, default_labels=new_name_finder.known_name
                )
                self.to_be_sent.append(
                    dict(type="reconnect", uid=uid, pres=pres, posts=posts)
                )
                changed = True
        return changed

    def get_parents(self, uid, default_labels=None):
        """Get parent networks for a connection"""
        while uid not in self.parents:
            net = self.networks_to_search.pop(0)
            net_uid = self.page.get_uid(net, default_labels=default_labels)
            for n in net.nodes:
                n_uid = self.page.get_uid(n, default_labels=default_labels)
                self.parents[n_uid] = net_uid
            for e in net.ensembles:
                e_uid = self.page.get_uid(e, default_labels=default_labels)
                self.parents[e_uid] = net_uid
            for n in net.networks:
                n_uid = self.page.get_uid(n, default_labels=default_labels)
                self.parents[n_uid] = net_uid
                self.networks_to_search.append(n)
        parents = [uid]
        while parents[-1] in self.parents:
            parents.append(self.parents[parents[-1]])
        return parents

    def modified_config(self):
        self.page.modified_config()

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
            client.write_text(json.dumps(info))

        if len(self.to_be_expanded) > 0:
            with self.page.lock:
                network = self.to_be_expanded.popleft()
                self.expand_network(network, client)

    def javascript(self):
        return 'new Nengo.NetGraph(main, {uid:"%s"});' % id(self)

    def message(self, msg):
        try:
            info = json.loads(msg)
        except ValueError:
            print("invalid message", repr(msg))
            return
        action = info.get("act", None)
        undo = info.get("undo", None)
        event = info.get("event", None)
        if action is not None:
            del info["act"]
            if action in ("auto_expand", "auto_collapse"):
                getattr(self, "act_" + action[5:])(**info)
            elif action in ("pan", "zoom", "create_modal"):
                # These should not use the undo stack
                getattr(self, "act_" + action)(**info)
            else:
                try:
                    act = nengo_gui.user_action.create_action(action, self, **info)
                    self.page.undo_stack.append([act])
                    del self.page.redo_stack[:]
                except:
                    print("error processing message", repr(msg))
                    traceback.print_exc()
        elif undo is not None:
            if undo == "1":
                self.undo()
            else:
                self.redo()
        elif event is not None:
            self.handle_event(event, info)
        else:
            print("received message", msg)

    def undo(self):
        if self.page.undo_stack:
            action = self.page.undo_stack.pop()
            re = []
            for act in action:
                act.undo()
                re.insert(0, act)
            self.page.redo_stack.append(re)

    def redo(self):
        if self.page.redo_stack:
            action = self.page.redo_stack.pop()
            un = []
            for act in action:
                act.apply()
                un.insert(0, act)
            self.page.undo_stack.append(un)

    def act_expand(self, uid):
        net = self.uids[uid]
        self.to_be_expanded.append(net)
        self.page.config[net].expanded = True
        self.modified_config()

    def act_collapse(self, uid):
        net = self.uids[uid]
        self.page.config[net].expanded = False
        self.remove_uids(net)
        self.modified_config()

    def remove_uids(self, net):
        for items in [net.ensembles, net.networks, net.nodes, net.connections]:
            for item in items:
                uid = self.page.get_uid(item)
                if uid in self.uids:
                    del self.uids[uid]
        for n in net.networks:
            self.remove_uids(n)

    def act_pan(self, x, y):
        self.page.config[self.page.model].pos = x, y
        self.modified_config()

    def act_zoom(self, scale, x, y):
        self.page.config[self.page.model].size = scale, scale
        self.page.config[self.page.model].pos = x, y
        self.modified_config()

    def act_create_modal(self, uid, **info):
        js = infomodal(self, uid, **info)
        self.to_be_sent.append(dict(type="js", code=js))

    def expand_network(self, network, client):
        """Display an expanded network, including the root network"""

        if not self.page.config[network].has_layout:
            pos = self.layout.make_layout(network)
            for obj, layout in pos.items():
                self.page.config[obj].pos = layout["y"], layout["x"]
                self.page.config[obj].size = layout["h"] / 2, layout["w"] / 2
            self.page.config[network].has_layout = True

        if network is self.page.model:
            parent = None
        else:
            parent = self.page.get_uid(network)
        for ens in network.ensembles:
            self.create_object(client, ens, obj_type="ens", parent=parent)
        for node in network.nodes:
            self.create_object(client, node, obj_type="node", parent=parent)
        for net in network.networks:
            self.create_object(client, net, obj_type="net", parent=parent)
        for conn in network.connections:
            self.create_connection(client, conn, parent=parent)
        self.page.config[network].expanded = True

    def create_object(self, client, obj, obj_type, parent):
        """Send the JSON of the newly created objects to client-side"""
        uid = self.page.get_uid(obj)

        # if the uid already exists, then it's already been inserted in
        # the netgraph, so don't send anything
        if uid in self.uids:
            return

        self.uids[uid] = obj

        pos = self.page.config[obj].pos
        if pos is None:
            import random

            pos = random.uniform(0, 1), random.uniform(0, 1)
            self.page.config[obj].pos = pos

        size = self.page.config[obj].size
        if size is None:
            size = (0.1, 0.1)
            self.page.config[obj].size = size

        label = self.page.get_label(obj)

        info = dict(
            uid=uid,
            label=escape(label),
            pos=pos,
            type=obj_type,
            size=size,
            parent=parent,
        )
        info.update(self.get_extra_info(obj))

        if type == "net":
            info["expanded"] = self.page.config[obj].expanded

        client.write_text(json.dumps(info))

    def get_extra_info(self, obj):
        """Determine helper information for each nengo object.

        This is used by the client side to configure the display.  It is also
        used by the reload() code to determine if a NetGraph object should
        be recreated.
        """
        info = {}
        if isinstance(obj, nengo.Node):
            if obj.output is None or (
                isinstance(obj.output, OverriddenOutput)
                and obj.output.base_output is None
            ):
                info["passthrough"] = True
            if callable(obj.output) and hasattr(obj.output, "_nengo_html_"):
                info["html"] = True
            info["dimensions"] = int(obj.size_out)
        elif isinstance(obj, nengo.Connection):
            info["kind"] = NetGraph.connection_kind(obj)
        elif isinstance(obj, nengo.Ensemble):
            info["dimensions"] = int(obj.size_out)
            info["n_neurons"] = int(obj.n_neurons)
        elif Value.default_output(obj) is not None:
            info["default_output"] = True

        info["sp_targets"] = nengo_gui.components.spa_plot.SpaPlot.applicable_targets(
            obj
        )
        return info

    def send_pan_and_zoom(self, client):
        pan = self.page.config[self.page.model].pos
        if pan is None:
            pan = 0, 0
        zoom = self.page.config[self.page.model].size
        if zoom is None:
            zoom = 1.0
        else:
            zoom = zoom[0]
        client.write_text(json.dumps(dict(type="pan", pan=pan)))
        client.write_text(json.dumps(dict(type="zoom", zoom=zoom)))

    @staticmethod
    def connection_pre_obj(conn):
        """
        Returns the pre-object of the given connection. Tries to make sure that
        the pre-object is an Ensemble. For example, if the connection originates
        from the ".neurons" object, the ensemble corresponding to the raw
        neurons is returned.
        """
        pre = conn.pre_obj
        if isinstance(pre, nengo.ensemble.Neurons):
            pre = pre.ensemble
        return pre

    @staticmethod
    def connection_post_obj(conn):
        """
        Returns the post-object relevant to the visualisation of the given
        connection. If the connection is a learning rule, returns the
        post-ensemble of that connection. If the connection ends in a
        ".neurons" object, returns the corresponding ensemble.
        """
        post = conn.post_obj
        if isinstance(post, nengo.connection.LearningRule):
            post = post.connection.post
            if isinstance(post, nengo.base.ObjView):
                post = post.obj
        if isinstance(post, nengo.ensemble.Neurons):
            post = post.ensemble
        return post

    @staticmethod
    def connection_kind(conn):
        """
        Categorises the given connection into one of three kinds: modulatory,
        inhibitory, and normal.
        """

        # Fetch the pre and post object for convenience
        pre, post = conn.pre_obj, conn.post_obj

        # Try to determine the connection kind by examining the connection class
        # and weight matrix
        kind = "normal"
        if hasattr(conn, "kind"):
            kind = conn.kind
        if isinstance(post, nengo.connection.LearningRule):
            kind = "modulatory"
        elif isinstance(post, nengo.ensemble.Neurons):
            trafo = conn.transform
            if hasattr(nengo, "transforms"):  # Support for Nengo 3.0
                if not isinstance(trafo, nengo.transforms.NoTransform):
                    trafo = trafo.sample()

            if hasattr(trafo, "size"):
                if trafo.size > 0 and (
                    np.all(trafo <= 0.0) and not np.all(np.isclose(trafo, 0.0))
                ):
                    return "inhibitory"

        # Support biologically plausible connections as e.g. provided by
        # nengo_bio
        if hasattr(conn, "dales_principle") and conn.dales_principle:
            if hasattr(pre, "p_exc") and (not pre.p_exc is None):
                is_purely_excitatory = np.allclose(pre.p_exc, 1.0)
                is_purely_inhibitory = np.allclose(pre.p_exc, 0.0)
                if kind == "inhibitory" and is_purely_excitatory:
                    kind = "dead"
                elif kind == "excitatory" and is_purely_inhibitory:
                    kind = "dead"

        return kind

    def get_connection_hierarchy(self, conn, default_labels=None):
        """
        For the given connection returns the pre and post objects and their
        hierarchy within the sub-network stack. Connection targets may either
        be ensembles or other connections (in the case of a connection
        targeting a learning rule.

        Parameters
        ----------
        conn : nengo.Connection
               Connection object for which the hierarchy should be computed.
        default_labels: nengo_gui.NameFinder
                        NameFinder instance used to derive the uids that are
                        being returned. If null, the default NameFinder instance
                        of this NetGraph instance is used.

        Returns
        -------
        (list, list)
            The first list contains the hierarchy for the pre-connection, the
            second list the hierarchy for the post-connection. The first element
            in either list corresponds to the actual target object, the
            remaining lists to the parent networks. All list elements are UIDs.
        """

        # Fetch the uid for the pre and post connection objects
        pre = self.page.get_uid(
            NetGraph.connection_pre_obj(conn), default_labels=default_labels
        )
        post = self.page.get_uid(
            NetGraph.connection_post_obj(conn), default_labels=default_labels
        )

        # Fetch the network hierarchy up to the post- and pre-connection object
        pres = self.get_parents(pre, default_labels=default_labels)[:-1]
        posts = self.get_parents(post, default_labels=default_labels)[:-1]

        # If this is a modulatory connection, connect to the connection that
        # is being trained
        if isinstance(conn.post_obj, nengo.connection.LearningRule):
            posts[0] = self.page.get_uid(
                conn.post_obj.connection, default_labels=default_labels
            )

        return pres, posts

    def create_connection(self, client, conn, parent):
        """
        Assembles the a JSON description of the given connection object and
        sends it to the client.

        Parameters
        ----------
        client : WebSocket
                 Websocket object to which the assembled JSON description is
                 sent.
        conn : nengo.Connection
               Connection object for which the description should be generated.
        parent : str
                 UID of the parent network the connection belongs to.
        """

        # Fetch the connection kind
        kind = kind = NetGraph.connection_kind(conn)
        if kind == "dead":
            return

        # Generate a uid for the connection
        uid = self.page.get_uid(conn)
        if uid in self.uids:
            return
        self.uids[uid] = conn

        # Fetch the pre and post object hierarchy
        pres, posts = self.get_connection_hierarchy(conn)

        # Serialise the connection descriptor and send it to the client
        info = dict(
            uid=uid, pre=pres, post=posts, type="conn", parent=parent, kind=kind
        )
        client.write_text(json.dumps(info))

    def handle_event(self, event, info):
        if event == "keyup":
            self.page.keys_pressed.discard(info["key"])
            self.page.key_codes_pressed.discard(info["keyCode"])
        elif event == "keydown":
            self.page.keys_pressed.add(info["key"])
            self.page.key_codes_pressed.add(info["keyCode"])
