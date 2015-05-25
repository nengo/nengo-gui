import time
import nengo


class ModelManager(object):

    def __init__(self, model, locals):
        self.model = model
        self.locals = locals
        # self.name_finder = nengo_viz.NameFinder(locals, model)
        # self.default_labels = self.name_finder.known_name

        self.uid_prefix_counter = {}

        # NameFinder __init__
        self._names = {}
        for k, v in locals.items():
            if not k.startswith('_'):
                try:
                    self._names[v] = k
                except TypeError:
                    pass
        self.names_time = 0.0
        self.find_names(model)

        self._names2 = {}
        for k, v in locals.items():
            if not k.startswith('_'):
                try:
                    self._names2[v] = k
                except TypeError:
                    pass
        self.names2_time = 0.0

        # LayoutParentFinder __init__
        # self.network = network

        # dictionary to keep track of parents of items in Network
        self.parents = {}

        # subnetworks that have not yet been examined for parents
        self.unexamined_networks = [model]

        self.parent_time = 0.0

        # NetGraphParentFinder __init__
        self._parents_uid = {}
        # self.viz = viz
        self.networks_to_search = [model]
        self.parent_chain_time = 0.0

    def find_parent(self, obj):
        """Return the parent of an object in the model.

        The layout system needs to know the parents of items so that it can
        handle a Connection into a deeply nested subnetwork (that Connection
        should be treated as a Connection to the Network that is a direct
        child of the Network we are currently laying out).  But, we don't
        want to do a complete search of the entire graph.  So, instead we
        do an incremental breadth-first search until we find the component
        we are looking for.
        """
        t0 = time.time()
        if obj is self.model:
            # the top Network does not have a parent
            return None
        parent = self.parents.get(obj, None)
        while parent is None:
            if len(self.unexamined_networks) == 0:
                # there are no networks left we haven't looked into
                # this should not happen in a valid nengo.Network
                print("could not find parent of", obj)
                return None
            # grab the next network we haven't looked into
            net = self.unexamined_networks.pop(0)
            # identify all its children
            for n in net.nodes:
                self.parents[n] = net
            for e in net.ensembles:
                self.parents[e] = net
            for n in net.networks:
                self.parents[n] = net
                # add child networks into the list to be searched
                self.unexamined_networks.append(n)
            parent = self.parents.get(obj, None)
        self.parent_time += time.time() - t0
        return parent

    def get_parent_chain(self, uid):
        t0 = time.time()
        while uid not in self._parents_uid:
            net = self.networks_to_search.pop(0)
            net_uid = self.get_uid(net)
            for n in net.nodes:
                n_uid = self.get_uid(n)
                self._parents_uid[n_uid] = net_uid
            for e in net.ensembles:
                e_uid = self.get_uid(e)
                self._parents_uid[e_uid] = net_uid
            for n in net.networks:
                n_uid = self.get_uid(n)
                self._parents_uid[n_uid] = net_uid
                self.networks_to_search.append(n)
        parents = [uid]
        while parents[-1] in self._parents_uid:
            parents.append(self._parents_uid[parents[-1]])

        self.parent_chain_time += time.time() - t0
        return parents

    def find_names(self, net):
        t0 = time.time()
        net_name = self._names[net]

        base_lists = ['ensembles', 'nodes', 'connections', 'networks']
        all_lists = ['all_ensembles', 'all_nodes', 'all_connections',
                     'all_networks', 'all_objects', 'all_probes']

        classes = (nengo.Node, nengo.Ensemble, nengo.Network,
                   nengo.Connection)

        exclude_set = set(base_lists + all_lists)

        for k in (set(dir(net)) - exclude_set):
            # if not k.startswith('_') and k not in base_lists + all_lists:
            if not k.startswith('_'):
                v = getattr(net, k)
                if isinstance(v, list):
                    for i, obj in enumerate(v):
                        if obj not in self._names:
                            n = '%s.%s[%d]' % (net_name, k, i)
                            self._names[obj] = n
                elif isinstance(v, classes):
                    if v not in self._names:
                        self._names[v] = '%s.%s' % (net_name, k)

        for type in base_lists:
            for i, obj in enumerate(getattr(net, type)):
                name = self._names.get(obj, None)
                if name is None:
                    name = '%s.%s[%d]' % (net_name, type, i)
                    self._names[obj] = name

        for n in net.networks:
            self.find_names(n)
        self.names_time += time.time() - t0

    def name_children(self, net):
        t0 = time.time()
        print("find parent", net)

        assert isinstance(net, nengo.Network)
        if net not in self._names2:
            parent = self.find_parent(net)
            self.name_children(parent)
        net_name = self._names2[net]
        # net_name = self.get_uid(net)

        base_lists = ['ensembles', 'nodes', 'connections', 'networks']
        all_lists = ['all_ensembles', 'all_nodes', 'all_connections',
                     'all_networks', 'all_objects', 'all_probes']

        classes = (nengo.Node, nengo.Ensemble, nengo.Network,
                   nengo.Connection)

        for k in dir(net):
            if not k.startswith('_') and k not in base_lists + all_lists:
                v = getattr(net, k)
                if isinstance(v, list):
                    for i, obj in enumerate(v):
                        if obj not in self._names2:
                            n = '%s.%s[%d]' % (net_name, k, i)
                            self._names2[obj] = n
                elif isinstance(v, classes):
                    if v not in self._names2:
                        self._names2[v] = '%s.%s' % (net_name, k)

        for type in base_lists:
            for i, obj in enumerate(getattr(net, type)):
                name = self._names2.get(obj, None)
                if name is None:
                    name = '%s.%s[%d]' % (net_name, type, i)
                    self._names2[obj] = name

        # for n in net.networks:
        #     self.find_names(n)
        self.names2_time += time.time() - t0

    def get_label(self, obj):
        label = obj.label
        if label is None:
            label = self._names.get(obj, None)
        if label is None:
            label = repr(obj)
        return label

    def get_uid(self, obj):
        if obj not in self._names2:
            parent = self.find_parent(obj)
            self.name_children(parent)
            # print("finding name", obj)
            # self.find_name(obj)
            # self._names2[obj] = self.find_name(obj)
        uid = self._names2[obj]
        if uid is None:
            uid = repr(obj)
            print("using repr for %s" % uid)
        # assert uid == self.get_uid_old(obj), "%s: %s != %s" % (obj, uid, self.get_uid_old(obj))
        if uid != self.get_uid_old(obj):
            # print self._names2
            import pdb; pdb.set_trace()
        return uid

    def get_uid_old(self, obj):
        uid = self._names.get(obj, None)
        if uid is None:
            uid = repr(obj)
            print("using repr for %s" % uid)
        return uid

    def set_uid(self, obj, uid):
        self._names[obj] = uid
        self._names2[obj] = uid
        
    def generate_uid(self, obj, prefix):
        index = self.uid_prefix_counter.get(prefix, 0)
        uid = '%s%d' % (prefix, index)
        while uid in self.locals:
            index += 1
            uid = '%s%d' % (prefix, index)
        self.uid_prefix_counter[prefix] = index + 1

        self.locals[uid] = obj
        self._names[obj] = uid
        self._names2[obj] = uid

    def remove_uid(self, uid):
        obj = self.locals[uid]
        del self.locals[uid]
        del self._names[obj]
        del self._names2[obj]

# class NameFinder(object):
#     def __init__(self, terms, net):
#         self.base_terms = terms
#         self.known_name = {}
#         for k, v in terms.items():
#             if not k.startswith('_'):
#                 try:
#                     self.known_name[v] = k
#                 except TypeError:
#                     pass
#         self.total_time = 0.0
#         self.find_names(net)

#     def find_names(self, net):
#         t0 = time.time()
#         net_name = self.known_name[net]

#         base_lists = ['ensembles', 'nodes', 'connections', 'networks']
#         all_lists = ['all_ensembles', 'all_nodes', 'all_connections',
#                      'all_networks', 'all_objects', 'all_probes']

#         classes = (nengo.Node, nengo.Ensemble, nengo.Network,
#                    nengo.Connection)

#         for k in dir(net):
#             if not k.startswith('_') and k not in base_lists + all_lists:
#                 v = getattr(net, k)
#                 if isinstance(v, list):
#                     for i, obj in enumerate(v):
#                         if obj not in self.known_name:
#                             n = '%s.%s[%d]' % (net_name, k, i)
#                             self.known_name[obj] = n
#                 elif isinstance(v, classes):
#                     self.known_name[v] = '%s.%s' % (net_name, k)


#         for type in base_lists:
#             for i, obj in enumerate(getattr(net, type)):
#                 name = self.known_name.get(obj, None)
#                 if name is None:
#                     name = '%s.%s[%d]' % (net_name, type, i)
#                     self.known_name[obj] = name

#         for n in net.networks:
#             self.find_names(n)
#         self.total_time += time.time() - t0

#     def name(self, obj):
#         return self.known_name[obj]


# class LayoutParentFinder(object):
#     def __init__(self, network):
#         self.network = network

#         # dictionary to keep track of parents of items in Network
#         self.parents = {}

#         # subnetworks that have not yet been examined for parents
#         self.unexamined_networks = [network]

#         self.total_time = 0.0

#     def find_parent(self, obj):
#         """Return the parent of an object in the model.

#         The layout system needs to know the parents of items so that it can
#         handle a Connection into a deeply nested subnetwork (that Connection
#         should be treated as a Connection to the Network that is a direct
#         child of the Network we are currently laying out).  But, we don't
#         want to do a complete search of the entire graph.  So, instead we
#         do an incremental breadth-first search until we find the component
#         we are looking for.
#         """
#         t0 = time.time()
#         if obj is self.network:
#             # the top Network does not have a parent
#             return None
#         parent = self.parents.get(obj, None)
#         while parent is None:
#             if len(self.unexamined_networks) == 0:
#                 # there are no networks left we haven't looked into
#                 # this should not happen in a valid nengo.Network
#                 print("could not find parent of", obj)
#                 return None
#             # grab the next network we haven't looked into
#             net = self.unexamined_networks.pop(0)
#             # identify all its children
#             for n in net.nodes:
#                 self.parents[n] = net
#             for e in net.ensembles:
#                 self.parents[e] = net
#             for n in net.networks:
#                 self.parents[n] = net
#                 # add child networks into the list to be searched
#                 self.unexamined_networks.append(n)
#             parent = self.parents.get(obj, None)
#         self.total_time += time.time() - t0
        # return parent


# class NetgraphParentFinder(object):

#     def __init__(self, viz):
#         # self.network = network
#         self.parents = {}
#         self.viz = viz
#         self.networks_to_search = [viz.model]
#         self.total_time = 0.0

#     def get_parents(self, uid):
#         t0 = time.time()
#         while uid not in self.parents:
#             net = self.networks_to_search.pop(0)
#             net_uid = self.viz.viz.get_uid(net)
#             for n in net.nodes:
#                 n_uid = self.viz.viz.get_uid(n)
#                 self.parents[n_uid] = net_uid
#             for e in net.ensembles:
#                 e_uid = self.viz.viz.get_uid(e)
#                 self.parents[e_uid] = net_uid
#             for n in net.networks:
#                 n_uid = self.viz.viz.get_uid(n)
#                 self.parents[n_uid] = net_uid
#                 self.networks_to_search.append(n)
#         parents = [uid]
#         while parents[-1] in self.parents:
#             parents.append(self.parents[parents[-1]])

#         self.total_time += time.time() - t0

#         return parents
