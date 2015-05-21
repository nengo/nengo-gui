import time
import nengo


class NameFinder(object):
    def __init__(self, terms, net):
        self.base_terms = terms
        self.known_name = {}
        for k, v in terms.items():
            if not k.startswith('_'):
                try:
                    self.known_name[v] = k
                except TypeError:
                    pass
        self.total_time = 0.0
        self.find_names(net)

    def find_names(self, net):
        t0 = time.time()
        net_name = self.known_name[net]

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
                        if obj not in self.known_name:
                            n = '%s.%s[%d]' % (net_name, k, i)
                            self.known_name[obj] = n
                elif isinstance(v, classes):
                    self.known_name[v] = '%s.%s' % (net_name, k)


        for type in base_lists:
            for i, obj in enumerate(getattr(net, type)):
                name = self.known_name.get(obj, None)
                if name is None:
                    name = '%s.%s[%d]' % (net_name, type, i)
                    self.known_name[obj] = name

        for n in net.networks:
            self.find_names(n)
        self.total_time += time.time() - t0

    def name(self, obj):
        return self.known_name[obj]


class LayoutParentFinder(object):
    def __init__(self, network):
        self.network = network

        # dictionary to keep track of parents of items in Network
        self.parents = {}

        # subnetworks that have not yet been examined for parents
        self.unexamined_networks = [network]

        self.total_time = 0.0

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
        if obj is self.network:
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
        self.total_time += time.time() - t0
        return parent


class NetgraphParentFinder(object):

    def __init__(self, viz):
        # self.network = network
        self.parents = {}
        self.viz = viz
        self.networks_to_search = [viz.model]
        self.total_time = 0.0

    def get_parents(self, uid):
        t0 = time.time()
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

        self.total_time += time.time() - t0

        return parents
