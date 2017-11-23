import logging
import os
import threading
import traceback
import warnings
from timeit import default_timer

import json
import nengo
from nengo.utils.compat import iteritems

from nengo_gui import components, exec_env, user_action
from nengo_gui.client import bind, ExposedToClient
from nengo_gui.components import Component, Network, Position
from nengo_gui.config import NengoGUIConfig, upgrade
from nengo_gui.editor import AceEditor
from nengo_gui.exceptions import StartedGUIException, StartedSimulatorException
from nengo_gui.layout import Layout
from nengo_gui.modal_js import infomodal
from nengo_gui.simcontrol import SimControl
from nengo_gui.threads import RepeatedThread

logger = logging.getLogger(__name__)


class ComponentManager(object):
    NENGO_MAP = {
        nengo.Connection: components.Connection,
        nengo.Ensemble: components.Ensemble,
        nengo.Network: components.Network,
        nengo.Node: components.Node,
    }

    def __init__(self, client, save_period=2.0):
        self.client = client
        self.save_period = save_period  # minimum time between saves

        self.by_uid = {}
        self._components = []
        self.dirty = False
        self.last_save = (None, None)

        # TODO: is lock necessary? Throttle save function?
        self.save_lock = threading.Lock()

    def __iter__(self):
        return iter(self._components)

    def __len__(self):
        return len(self._components)

    def add(self, component):
        """Add a new Component to an existing Page."""
        self.by_uid[component.uid] = component
        self._components.append(component)

    # def create_javascript(self):
    #     """Generate the javascript for the current network and layout."""
    #     assert isinstance(self._components[0], SimControl)
    #     main = (NetGraph, SimControl, AceEditor)

    #     main_js = '\n'.join([c.javascript() for c in self._components
    #                          if isinstance(c, main)])
    #     component_js = '\n'.join([c.javascript() for c in self._components
    #                               if not isinstance(c, main)])
    #     if not self.context.writeable:
    #         component_js += "$('#Open_file_button').addClass('deactivated');"
    #     return main_js, component_js

    def config_change(self, component, new_cfg, old_cfg):
        act = ConfigAction(self,
                           component=component,
                           new_cfg=new_cfg,
                           old_cfg=old_cfg)
        self.undo_stack.append([act])

    def create(self):
        for comp in self._components:
            if comp.uid != "model":
                comp.create()

    def load(self, filename, model, locals):
        """Load from a JSON file"""

        if filename is not None and filename.endswith(".py.cfg"):
            old_filename = filename
            filename = "%s.json" % (old_filename[:-len(".py.cfg")],)
            if os.path.exists(old_filename):
                print("Upgrading %r to new format, %r"
                      % (old_filename, filename))
                with open(old_filename, "r") as fp:
                    old_text = fp.read()
                new_text = upgrade(old_text, locals=locals)
                with open(filename, "w") as fp:
                    fp.write(new_text)
                # TODO: safer remove
                os.remove(old_filename)

        config = {}
        if filename is not None and os.path.exists(filename):
            with open(filename, "r") as fp:
                config = json.load(fp)

        if "model" not in config and model is not None:
            self.add(Network(
                self.client, model, "model", pos=Position(0, 0, 1.0, 1.0)))

        for obj, kwargs in iteritems(config):
            cls = getattr(components, kwargs.pop("cls"))
            if "obj" in kwargs:
                # For most components
                kwargs["obj"] = eval(kwargs["obj"], locals)
            else:
                # For components corresponding to Nengo objects
                kwargs["obj"] = eval(obj, locals)
            self.add(cls(client=self.client, uid=obj, **kwargs))

        self.dirty = False
        self.last_save = (filename, None)

    def remove_graph(self, component):
        self.undo_stack.append([
            RemoveGraph(self.net_graph, component, self.names.uid(component))])

    def remove(self, component):
        """Remove a component from the layout."""
        del self.by_uid[component.uid]
        # self.remove_uid(component.uid)
        self._components.remove(component)

    def remove_uid(self, uid):
        """Remove a generated uid (for when a component is removed)."""
        if uid in self.locals:
            obj = self.locals[uid]
            del self.locals[uid]
            del self.names[obj]
        else:
            warnings.warn("remove_uid called on unknown uid: %s" % uid)

    def save(self, filename, names, force=False):
        """Write the .cfg file to disk.

        Parameters
        ----------
        force : bool
            If True, then always save right now, even if dirty.
        """
        if filename != self.last_save[0]:
            force = True

        # TODO: look into how to actually determine dirtiness,
        #       is it worth keeping track?
        if not force and not self.dirty:
            return

        now = default_timer()
        if not force and self.last_save[1] is not None:
            if (now - self.last_save) < self.save_period:
                return

        with self.save_lock:
            self.last_save = now
            self.dirty = False
            try:
                with open(filename, 'w') as f:
                    # TODO: handle unicode correctly
                    json.dump(self.by_uid, f,
                              cls=NengoGUIConfig,
                              indent=2,
                              sort_keys=True)
            except IOError:
                print("Could not save %s; permission denied" % (filename,))

    def update(self, locals, namefinder):
        # Add any components from locals
        for name, obj in iteritems(locals):
            if isinstance(obj, components.Component):
                self.add(obj)
                # TODO: attach?
                # obj.attach(page=self, config=self.config.cfg[name], uid=name)

        # Make components for Nengo objects not in locals
        for obj, uid in iteritems(namefinder.names):
            if uid in self.by_uid:
                continue

            if isinstance(obj, nengo.Connection):
                self.add(components.Connection(
                    self.client, obj, uid, namefinder))
            elif isinstance(obj, tuple(self.NENGO_MAP)):
                for nengocls, compcls in iteritems(self.NENGO_MAP):
                    if isinstance(obj, nengocls):
                        self.add(compcls(self.client, obj, name))
                        break


class LiveContext(object):
    def __init__(self, client, model=None, locals=None):
        self.client = client
        self.model = model
        self.locals = locals
        if locals is not None:
            self.locals = locals.copy()
        self.code = None  # the code for the network
        self.filename = None  # filename corresponding to code

    @property
    def code(self):
        return self._code

    @code.setter
    def code(self, val):
        if val is not None and val != self._code:
            self.client.dispatch("editor.set_code", code=val)
        self._code = val

    def execute(self, code):
        """Run the given code to generate self.network and self.locals.

        The code will be stored in self.code, any output to stdout will
        be sent to the client.
        """
        errored = False

        newlocals = {}

        if self.filename is not None:
            newlocals['__file__'] = self.filename

        # Clear any existing errors
        self.client.dispatch("editor.stderr", output=None, line=None)

        env = exec_env.ExecutionEnvironment(self.filename)
        try:
            with env:
                compiled = compile(code, self.filename, mode='exec')
                exec(compiled, newlocals)
        # TODO: Should we actually let these warn and continue?
        except StartedSimulatorException:
            line = exec_env.determine_line(self.filename)
            env.stdout.write('Warning: Simulators cannot be manually '
                             'run inside nengo_gui (line %d)\n' % line)
        except StartedGUIException:
            line = exec_env.determine_line(self.filename)
            env.stdout.write('Warning: nengo_gui cannot be run inside '
                             'nengo_gui (line %d)\n' % line)
        except Exception:
            self.client.dispatch("editor.stderr",
                                 output=traceback.format_exc(),
                                 line=exec_env.determine_line(self.filename))
            errored = True
        self.client.dispatch("editor.stdout",
                             output=env.stdout.getvalue(),
                             line=None)

        # make sure we've defined a nengo.Network
        self.model = newlocals.get('model', None)
        if not isinstance(self.model, nengo.Network):
            if not errored:
                self.client.dispatch(
                    "editor.stderr",
                    output="Must declare a nengo.Network called 'model'",
                    line=None)
                errored = True
            self.model = None

        self.code = code  # TODO: do we definitely want to set code here?
        if not errored:
            self.locals = newlocals

    def load(self, filename, force=False):
        if self.filename == filename and not force:
            raise ValueError("That file is already loaded")
        try:
            with open(filename) as f:
                code = f.read()
            self.filename = filename
        except IOError as e:
            logger.error("IOError loading %r: %s", filename, e)
            code = ''
            self.filename = None

        if code != self.code:
            self.execute(code)


class NameFinder(object):

    CLASSES = nengo.Node, nengo.Ensemble, nengo.Network, nengo.Connection
    TYPELISTS = 'ensembles', 'nodes', 'connections', 'networks'
    NETIGNORE = ('all_ensembles', 'all_nodes', 'all_connections',
                 'all_networks', 'all_objects', 'all_probes') + TYPELISTS

    def __init__(self, autoprefix="_viz_"):
        self.names = {}
        self.autoprefix = autoprefix
        self.autocount = 0

    def __contains__(self, obj):
        return obj in self.names

    def __getitem__(self, obj):
        return self.names[obj]

    def add(self, obj):
        """Add this object to the name finder and return its name.

        This is used for new Components being created (so they can have
        a unique identifier in the .cfg file).
        """
        name = '%s%d' % (self.autoprefix, self.autocount)
        used_names = list(self.names.values())
        while name in used_names:
            self.autocount += 1
            name = '%s%d' % (self.autoprefix, self.autocount)
        self.names[obj] = name
        return name

    def update(self, names):
        nets = []
        for k, v in iteritems(names):
            if not k.startswith('_'):
                try:
                    self.names[v] = k
                    if isinstance(v, nengo.Network):
                        nets.append(v)
                except TypeError:
                    pass

        if len(nets) > 1:
            logger.info("More than one top-level model defined.")

        for net in nets:
            self._parse_network(net)

    def _parse_network(self, net):
        net_name = self.names.get(net, None)
        for inst_attr in dir(net):
            private = inst_attr.startswith('_')
            if not private and inst_attr not in self.NETIGNORE:
                attr = getattr(net, inst_attr)
                if isinstance(attr, list):
                    for i, obj in enumerate(attr):
                        if obj not in self.names:
                            n = '%s.%s[%d]' % (net_name, inst_attr, i)
                            self.names[obj] = n
                elif isinstance(attr, self.CLASSES):
                    if attr not in self.names:
                        self.names[attr] = '%s.%s' % (net_name, inst_attr)

        for obj_type in self.TYPELISTS:
            for i, obj in enumerate(getattr(net, obj_type)):
                name = self.names.get(obj, None)
                if name is None:
                    name = '%s.%s[%d]' % (net_name, obj_type, i)
                    self.names[obj] = name

        for n in net.networks:
            self._parse_network(n)


class NetGraph(ExposedToClient):
    """Handles computations and communications for NetGraph on the JS side.

    Communicates to all NetGraph components for creation, deletion and
    manipulation.
    """

    RELOAD_EVERY = 0.5  # How often to poll for reload

    def __init__(self, client, filename, filename_cfg,
                 model=None, locals=None):
        super(NetGraph, self).__init__(client)

        self.lock = threading.Lock()

        self.layout = None

        self.networks_to_search = []

        self.undo_stack = []
        self.redo_stack = []

        self.uids = {}
        self.parents = {}

        self.context = LiveContext(client, model, locals)
        self.components = ComponentManager(client)
        self.names = NameFinder()

        self.load(filename, filename_cfg, force=True)

        self.filethread = RepeatedThread(self.RELOAD_EVERY, self._check_file)
        self.filethread.start()  # TODO: defer until after load?

    # TODO: These should be done as part of loading the model

    # def attach(self, page, config):
    #     super(NetGraph, self).attach(page, config)
    #     self.layout = Layout(page.net.obj)
    #     self.to_be_expanded.append(page.net.obj)
    #     self.networks_to_search.append(page.net.obj)

    #     try:
    #         self.last_modify_time = os.path.getmtime(page.net.filename)
    #     except (OSError, TypeError):
    #         self.last_modify_time = None

    @property
    def filename(self):
        return self.context.filename

    @property
    def model(self):
        return self.context.model

    def set_editor_code(self, code):
        self.client.dispatch("editor.code", code=code)

    def add_nengo_objects(self):
        for c in self.components:
            c.add_nengo_objects(self.context.model)

    def remove_nengo_objects(self):
        for c in self.components:
            c.remove_nengo_objects(self.context.model)
        # TODO: add checks to make sure everything's been removed

    def _check_file(self):
        if self.context.filename is not None:
            try:
                t = os.path.getmtime(self.context.filename)
                if self.last_modify_time is None or self.last_modify_time < t:
                    self.reload()
                    self.last_modify_time = t
            except OSError:
                pass

        # TODO: Shouldn't be necessary..
        # with self.lock:
        #     new_code = self.new_code
        #     # the lock is in case update_code() is called between these lines
        #     self.new_code = None

        # if new_code is not None:
        #     self.reload(code=new_code)

    def load(self, filename, filename_cfg, force=False):
        # Load the .py file
        self.context.load(filename, force=force)
        # Load the .cfg file
        self.components.load(filename_cfg,
                             self.context.model,
                             self.context.locals)

        # Figure out good names for objects
        self.names.update(self.context.locals)

        # Add everything to the component manager
        self.components.update(self.context.locals, self.names)

        # if len(self.to_be_expanded) > 0:
        #     with self.page.lock:
        #         network = self.to_be_expanded.popleft()
        #         self.expand_network(network, client)

    def reload(self, code=None):
        """Called when new code has been detected
        checks that the page is not currently being used
        and thus can be updated"""
        with self.lock:
            if code is None:
                with open(self.context.filename) as f:
                    code = f.read()
            self._reload(code=code)

    def _reload(self, code):
        if self.context.code == code:
            # don't re-execute the identical code
            return
        else:
            # send the new code to the client
            self._set_editor_code(code)

        # Do the load step with new objects
        context = LiveContext(self.context.filename, None, None)
        components = ComponentManager()
        names = NameFinder()

        context.load(context.filename, force=True)
        # TODO: fix
        components.load(context.model, context.locals)
        names.update(context.locals)
        components.update(context.locals, names)

        # Go through the items in the newly loaded object.
        for comp in components:
            # If the uid matches an old one, process it
            if comp.uid in self.components:
                oldcomp = self.components.by_uid[comp.uid]
                if not comp.similar(oldcomp):
                    # Vastly different object, so remove old, add new.
                    oldcomp.delete(self.client)
                    comp.create(self.client)
                else:
                    # TODO: or other way around? This makes more sense though
                    oldcomp.update(comp, self.client)
                # That component has now been processed, so remove it
                self.components.remove(oldcomp)

            # Otherwise it's new so add it
            else:
                comp.create(self.client)

        # Any old items not yet processed should be deleted
        # NB: Copy list before iterating because it will change size
        for oldcomp in list(self.components):
            self.components.remove(oldcomp)

        # The client should now be updated, so replace internals
        self.context = context
        self.components = components
        self.names = names

    # TODO: this should be done now? Maybe? Go through
    def _reload(self, code):
        """Loads and executes the code, removing old items,
        updating changed items and adding new ones"""

        # TODO: ???
        old_locals = self.page.last_good_locals
        old_default_labels = self.page.default_labels

        if self.context.code == code:
            # don't re-execute the identical code
            return
        else:
            # send the new code to the client
            self._set_editor_code(code)

        self.page.execute(code)

        if self.page.error is not None:
            return

        name_finder = NameFinder(self.page.locals, self.page.model)

        self.networks_to_search = [self.page.model]
        self.parents = {}

        removed_uids = {}
        rebuilt_objects = []

        # for each item in the old model, find the matching new item
        # for Nodes, Ensembles, and Networks, this means to find the item
        # with the same uid.  For Connections, we don't really have a uid,
        # so we use the uids of the pre and post objects.
        for uid, old_item in nengo.utils.compat.iteritems(dict(self.uids)):
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
            new_uid = name_finder[new_item]
            if new_uid != uid:
                new_item = None

            same_class = False
            for cls in (nengo.Ensemble, nengo.Node,
                        nengo.Network, nengo.Connection):
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
            elif (self.get_extra_info(new_item) !=
                  self.get_extra_info(old_item)):
                keep_object = False

            if not keep_object:
                self.to_be_sent.append(dict(
                    type='remove', uid=uid))
                del self.uids[uid]
                removed_uids[old_item] = uid
                rebuilt_objects.append(uid)
            else:
                # fix aspects of the item that may have changed
                if self._reload_update_item(uid, old_item, new_item,
                                            name_finder):
                    # something has changed about this object, so rebuild
                    # the components that use it
                    rebuilt_objects.append(uid)

                self.uids[uid] = new_item

        # TODO: just call expand geez
        self.to_be_expanded.append(self.page.model)

        self.page.name_finder = name_finder
        self.page.default_labels = name_finder.known_name
        self.page.config = self.page.load_config()
        self.page.uid_prefix_counter = {}
        self.layout = Layout(self.page.model)
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
                if item not in self.uids and item not in collapsed_items:

                    # item is a python string that is an argument to the
                    # constructor for the Component.  So it could be 'a',
                    # 'model.ensembles[3]', 'True', or even 'target=a'.
                    # We need to evaluate this string in the context of the
                    # locals dictionary and see what object it refers to
                    # so we can determine whether to rebuild this component.
                    #
                    # The following lambda should do this, handling both
                    # the normal argument case and the keyword argument case.
                    safe_eval = ('(lambda *a, **b: '
                                 'list(a) + list(b.values()))(%s)[0]')

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
                    elif (self.get_extra_info(new_obj) !=
                          self.get_extra_info(old_obj)):
                        rebuilt_objects.append(item)

                    # add this to the list of collapsed items, so we
                    # don't recheck it if there's another Component that
                    # also depends on this
                    collapsed_items.append(item)

                if item in rebuilt_objects:
                    self.to_be_sent.append(dict(type='delete_graph',
                                                uid=c.original_id,
                                                notify_server=False))
                    rebuild_components.append(c.uid)
                    self.page.components.remove(c)
                    break
            else:
                for item in c.code_python_args(old_default_labels):
                    if item in removed_items:
                        self.to_be_sent.append(dict(type='delete_graph',
                                                    uid=c.original_id,
                                                    notify_server=False))
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
                    self.page.components.add(obj, attach=True)
                    self.to_be_sent.append(dict(type='js',
                                                code=obj.javascript()))
                    components.append(obj)
                    continue

                # otherwise, find the corresponding old Component
                index = component_uids.index(name)
                old_component = self.page.components[index]
                if isinstance(obj, (SimControl, AceEditor, NetGraph)):
                    # just keep these ones
                    components.append(old_component)
                else:
                    # replace these components with the newly generated ones
                    try:
                        self.page.components.add(obj, attach=True)
                        old_component.replace_with = obj
                        obj.original_id = old_component.original_id
                    except:
                        traceback.print_exc()
                        print('failed to recreate plot for %s' % obj)
                    components.append(obj)

        components.sort(key=lambda x: x.component_order)

        self.page.components = components

        # notifies SimControl to pause the simulation
        self.page.changed = True

    def _reload_update_item(self, uid, old_item, new_item, new_name_finder):
        """Tell the client about changes to the item due to reload."""
        changed = False
        if isinstance(old_item, (nengo.Node,
                                 nengo.Ensemble,
                                 nengo.Network)):
            old_label = self.page.names.label(old_item)
            new_label = new_name_finder.label(new_item)

            if old_label != new_label:
                self.to_be_sent.append(dict(
                    type='rename', uid=uid, name=new_label))
                changed = True
            if isinstance(old_item, nengo.Network):
                # TODO: just call expand geez
                if self.page.config[old_item].expanded:
                    self.to_be_expanded.append(new_item)
                    changed = True

        elif isinstance(old_item, nengo.Connection):
            # if new_pre != old_pre or new_post != old_post:
            #     # if the connection has changed, tell javascript
            #     pres = self.get_parents(
            #         new_pre,
            #         default_labels=new_name_finder.known_name)[:-1]
            #     posts = self.get_parents(
            #         new_post,
            #         default_labels=new_name_finder.known_name)[:-1]
            #     self.to_be_sent.append(dict(
            #         type='reconnect', uid=uid,
            #         pres=pres, posts=posts))
            #     changed = True
            pass

        return changed

    # def get_parents(self, uid, default_labels=None):
    #     while uid not in self.parents:
    #         net = self.networks_to_search.pop(0)
    #         net_uid = self.page.names.uid(net, names=default_labels)
    #         for n in net.nodes:
    #             n_uid = self.page.names.uid(n, names=default_labels)
    #             self.parents[n_uid] = net_uid
    #         for e in net.ensembles:
    #             e_uid = self.page.names.uid(e, names=default_labels)
    #             self.parents[e_uid] = net_uid
    #         for n in net.networks:
    #             n_uid = self.page.names.uid(n, names=default_labels)
    #             self.parents[n_uid] = net_uid
    #             self.networks_to_search.append(n)
    #     parents = [uid]
    #     while parents[-1] in self.parents:
    #         parents.append(self.parents[parents[-1]])
    #     return parents

    @bind("netgraph.undo")
    def undo(self):
        if self.page.undo_stack:
            action = self.page.undo_stack.pop()
            re = []
            for act in action:
                act.undo()
                re.insert(0, act)
            self.page.redo_stack.append(re)

    @bind("netgraph.redo")
    def redo(self):
        if self.page.redo_stack:
            action = self.page.redo_stack.pop()
            un = []
            for act in action:
                act.apply()
                un.insert(0, act)
            self.page.undo_stack.append(un)

    @bind("netgraph.expand")
    def act_expand(self, uid):
        net = self.uids[uid]
        # TODO: just call expand geez
        self.to_be_expanded.append(net)
        self.page.config[net].expanded = True
        self.components.dirty = True

    @bind("netgraph.collapse")
    def act_collapse(self, uid):
        net = self.uids[uid]
        self.page.config[net].expanded = False
        self.remove_uids(net)
        self.components.dirty = True

    def remove_uids(self, net):
        for items in [net.ensembles, net.networks, net.nodes, net.connections]:
            for item in items:
                uid = self.page.names.uid(item)
                if uid in self.uids:
                    del self.uids[uid]
        for n in net.networks:
            self.remove_uids(n)

    @bind("netgraph.pan")
    def act_pan(self, x, y):
        self.page.config[self.page.model].pos = x, y
        self.components.dirty = True

    @bind("netgraph.zoom")
    def act_zoom(self, scale, x, y):
        self.page.config[self.page.model].size = scale, scale
        self.page.config[self.page.model].pos = x, y
        self.components.dirty = True

    @bind("netgraph.create_modal")
    def act_create_modal(self, uid, **info):
        js = infomodal(self, uid, **info)
        self.to_be_sent.append(dict(type='js', code=js))

    @bind("netgraph.action")
    def action(self, action, **kwargs):
        if action == "expand":
            act = user_action.ExpandCollapse(self, expand=True, **kwargs)
        elif action == "collapse":
            act = user_action.ExpandCollapse(self, expand=False, **kwargs)
        elif action == "create_graph":
            act = user_action.CreateGraph(self, **kwargs)
        elif action == "pos":
            act = user_action.Pos(self, **kwargs)
        elif action == "size":
            act = user_action.Size(self, **kwargs)
        elif action == "pos_size":
            act = user_action.PosSize(self, **kwargs)
        elif action == "feedforward_layout":
            act = user_action.FeedforwardLayout(self, **kwargs)
        elif action == "config":
            act = user_action.ConfigAction(self, **kwargs)
        else:
            act = user_action.Action(self, **kwargs)

        self.undo_stack.append([act])
        del self.redo_stack[:]

    def expand_network(self, network, client):
        if not self.page.config[network].has_layout:
            pos = self.layout.make_layout(network)
            for obj, layout in pos.items():
                self.page.config[obj].pos = layout['y'], layout['x']
                self.page.config[obj].size = layout['h'] / 2, layout['w'] / 2
            self.page.config[network].has_layout = True

        if network is self.page.model:
            parent = None
        else:
            parent = self.page.names.uid(network)
        for ens in network.ensembles:
            self.create_object(client, ens, type='ens', parent=parent)
        for node in network.nodes:
            self.create_object(client, node, type='node', parent=parent)
        for net in network.networks:
            self.create_object(client, net, type='net', parent=parent)
        for conn in network.connections:
            self.create_connection(client, conn, parent=parent)
        self.page.config[network].expanded = True

    def create_object(self, client, obj, type, parent):
        uid = self.page.names.uid(obj)
        if uid in self.uids:
            return

        pos = self.page.config[obj].pos
        if pos is None:
            import random
            pos = random.uniform(0, 1), random.uniform(0, 1)
            self.page.config[obj].pos = pos
        size = self.page.config[obj].size
        if size is None:
            size = (0.1, 0.1)
            self.page.config[obj].size = size
        label = self.page.names.label(obj)
        self.uids[uid] = obj
        info = dict(uid=uid, label=label, pos=pos, type=type, size=size,
                    parent=parent)
        if type == 'net':
            info['expanded'] = self.page.config[obj].expanded
        info.update(self.get_extra_info(obj))

        client.write_text(json.dumps(info))

    def create_connection(self, client, conn, parent):
        uid = self.page.names.uid(conn)
        if uid in self.uids:
            return
        pre = conn.pre_obj
        if isinstance(pre, nengo.ensemble.Neurons):
            pre = pre.ensemble
        post = conn.post_obj
        if isinstance(post, nengo.connection.LearningRule):
            post = post.connection.post
            if isinstance(post, nengo.base.ObjView):
                post = post.obj
        if isinstance(post, nengo.ensemble.Neurons):
            post = post.ensemble
        pre = self.page.names.uid(pre)
        post = self.page.names.uid(post)
        self.uids[uid] = conn
        pres = self.get_parents(pre)[:-1]
        posts = self.get_parents(post)[:-1]
        info = dict(uid=uid, pre=pres, post=posts, type='conn', parent=parent)
        client.write_text(json.dumps(info))

    @bind("netgraph.request_update")
    def update_client(self, initialize=False):
        if initialize:
            self.client.send("toolbar.filename", filename=self.filename)
            self.components.create()

            # When first attaching, send the pan and zoom
            # TODO: update

            # pan = self.config.cfg[self.context.model].pos
            # pan = (0, 0) if pan is None else pan
            # zoom = self.config.cfg[self.context.model].size
            # zoom = 1.0 if zoom is None else zoom[0]
            # self.client.send("netgraph.pan", pan=pan)
            # self.client.send("netgraph.zoom", zoom=zoom)
