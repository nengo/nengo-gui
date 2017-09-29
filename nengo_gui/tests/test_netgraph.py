import json
import os
import shutil
from operator import setitem

import nengo

from nengo_gui.compat import execfile
from nengo_gui.components import Value
from nengo_gui.netgraph import (
    ComponentManager, LiveContext, NameFinder, NetGraph)


class TestComponentManager(object):

    def test_load(self, client, example, tmpdir):
        shutil.copy2(example("default.py"), str(tmpdir))
        shutil.copy2(example("default.py.cfg"), str(tmpdir))
        fname = str(tmpdir.join("default.py"))

        execfile(fname)
        manager = ComponentManager()
        manager.load("%s.cfg" % (fname,), client, locals()["model"], locals())

        # Automatic upgrade
        assert not os.path.exists("%s.cfg" % (fname,))
        assert os.path.exists(str(tmpdir.join("default.json")))

        assert len(manager) == 7
        assert [type(c).__name__ for c in manager] == [
            "Ensemble", "Node", "Network",
            "Value", "Slider", "SpikeGrid", "Raster",
        ]

    # TODO: test more (kind of hard with how it's structured now though...)
    def test_update_create(self, client):
        names = NameFinder()
        with nengo.Network() as net:
            e1 = nengo.Ensemble(10, 1, label="ensemble")
            net.e2 = nengo.Ensemble(10, 1)
            nengo.Connection(e1, net.e2)
            net.e3 = nengo.Ensemble(10, 1, label="ensemble")
        c1 = Value(client, e1, "c1")
        c2 = Value(client, net.e2, "c2")
        c3 = Value(client, net.e3, "c3")
        names.update(locals())

        components = ComponentManager()
        components.update(locals(), names, client)
        assert set(e.uid for e in components) == set([
            "c1", "c2", "c3",
            "net", "e1", "net.e2", "net.e3", "net.connections[0]",
        ])

        components.create()
        assert len(client.ws.text_history) == 8
        for text in client.ws.text_history:
            assert text.startswith('["netgraph.create_')


class TestLiveContext(object):

    def test_load(self, client, example, tmpdir):
        shutil.copy2(example("default.py"), str(tmpdir))

        stream = {"stderr": (None, None), "stdout": (None, None)}
        seterr = lambda output, line: setitem(stream, "stderr", (output, line))
        setout = lambda output, line: setitem(stream, "stdout", (output, line))

        client.bind("editor.stderr", seterr)
        client.bind("editor.stdout", setout)

        context = LiveContext()
        context.load(str(tmpdir.join("default.py")), client)
        assert context.filename == str(tmpdir.join("default.py"))
        assert context.locals["__file__"] == str(tmpdir.join("default.py"))
        assert context.code.startswith("import nengo")
        assert isinstance(context.model, nengo.Network)
        assert stream["stderr"] == (None, None)
        assert stream["stdout"] == ("", None)



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


class TestNetGraph(object):

    def test_load(self, client, example, tmpdir):
        shutil.copy2(example("default.py"), str(tmpdir))
        shutil.copy2(example("default.py.cfg"), str(tmpdir))

        filename = str(tmpdir.join("default.py"))
        filename_cfg = str(tmpdir.join("default.py.cfg"))
        netgraph = NetGraph(client, filename, filename_cfg)

        assert client.ws.text_history[0] == '["netgraph.pan", {"pan": [0, 0]}]'
        assert client.ws.text_history[1] == '["netgraph.zoom", {"zoom": 1.0}]'

        assert False
