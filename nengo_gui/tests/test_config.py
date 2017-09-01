import nengo

from nengo_gui.config import Config


def test_params():
    config = Config()

    for cls in [nengo.Ensemble, nengo.Node, nengo.Network]:
        assert config[cls].pos is None
        assert config[cls].size is None
    assert config[nengo.Network].expanded is False
    assert config[nengo.Network].has_layout is False


def test_dumps():
    config = Config()

    with nengo.Network() as net:
        ens = nengo.Ensemble(10, 1)
        with nengo.Network() as subnet:
            node = nengo.Node(size_in=1)
    objs = {net: "net", ens: "ens", subnet: "subnet", node: "node"}

    for obj in objs:
        config[obj].pos = (0, 0)
        config[obj].size = 1.0

    config[subnet].expanded = True
    config[subnet].has_layout = True

    assert config.dumps(objs) == "\n".join([
        "_gui_config[ens].pos = (0, 0)",
        "_gui_config[ens].size = 1.0",
        "_gui_config[net].pos = (0, 0)",
        "_gui_config[net].size = 1.0",
        "_gui_config[net].expanded = False",
        "_gui_config[net].has_layout = False",
        "_gui_config[node].pos = (0, 0)",
        "_gui_config[node].size = 1.0",
        "_gui_config[subnet].pos = (0, 0)",
        "_gui_config[subnet].size = 1.0",
        "_gui_config[subnet].expanded = True",
        "_gui_config[subnet].has_layout = True",
    ])
