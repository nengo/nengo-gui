import nengo

from nengo_gui.netgraph import ComponentManager, NameFinder


class TestComponentManager(object):

    def test_add_sorted(self):
        """The add method adds in sorted order."""
        components = ComponentManager()
        components.add(10)
        components.add(1)
        assert components._components == [1, 10]
        components.add(5)
        assert components._components == [1, 5, 10]


class TestNameFinder(object):

    def test_simple_names(self):
        names = NameFinder()
        names.update({"a": "an object", "b": 3})
        assert names["an object"] == "a"
        assert names[3] == "b"

    def test_network(self):
        names = NameFinder()
        with nengo.Network() as net:
            net.product = nengo.networks.Product(10, 1)
            with net.product:
                net.product.ea = nengo.networks.EnsembleArray(10, 1)
        names.update(locals())
        assert names[net.product] == "net.product"
        assert names[net.product.output] == "net.product.output"
        assert names[net.product.ea] == "net.product.ea"
        assert (names[net.product.ea.ea_ensembles[0]] ==
                "net.product.ea.ea_ensembles[0]")

    def test_add(self):
        names = NameFinder(autoprefix="viz")
        names.update({"viz0": "a"})
        assert names.add("b") == "viz1"
        assert names.add("c") == "viz2"

    def test_label(self):
        names = NameFinder()
        with nengo.Network() as net:
            e1 = nengo.Ensemble(10, 1, label="ensemble")
            net.e2 = nengo.Ensemble(10, 1)
            net.e3 = nengo.Ensemble(10, 1, label="ensemble")
        names.update(locals())
        assert names[e1] == "e1"
        assert names[net.e2] == "net.e2"
        assert names[net.e3] == "net.e3"
        assert names.label(e1) == "ensemble"
        assert names.label(net.e2) == "e2"
        assert names.label(net.e3) == "ensemble"
