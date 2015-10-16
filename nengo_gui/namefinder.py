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
        self.find_names(net)

    def find_names(self, net):
        net_name = self.known_name[net]

        base_lists = ['ensembles', 'nodes', 'connections', 'networks']
        all_lists = ['all_ensembles', 'all_nodes', 'all_connections',
                     'all_networks', 'all_objects', 'all_probes']

        classes = (nengo.Node, nengo.Ensemble, nengo.Network,
                   nengo.Connection)

        for class_attr in dir(net):
            if(not class_attr.startswith('_')
                and class_attr not in base_lists + all_lists):
                attr = getattr(net, class_attr)
                if isinstance(attr, list):
                    for i, obj in enumerate(attr):
                        if obj not in self.known_name:
                            n = '%s.%s[%d]' % (net_name, class_attr, i)
                            self.known_name[obj] = n
                elif isinstance(attr, classes):
                    if attr not in self.known_name:
                        self.known_name[attr] = '%s.%s' % (net_name, class_attr)


        for type in base_lists:
            for i, obj in enumerate(getattr(net, type)):
                name = self.known_name.get(obj, None)
                if name is None:
                    name = '%s.%s[%d]' % (net_name, type, i)
                    self.known_name[obj] = name

        for n in net.networks:
            self.find_names(n)

    def name(self, obj):
        return self.known_name[obj]
