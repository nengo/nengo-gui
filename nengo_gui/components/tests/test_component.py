import pytest
import json
import nengo

from nengo_gui.config import Config
from nengo_gui.components.component import Component


def test_javascript_config():

    # Set up the component to be configured
    conf = Config()
    conf.configures(Component)
    co = Component()
    for k, v in Component.config_defaults.items():
        conf[Component].set_param(k, nengo.params.Parameter(v))
    co.attach(None, conf[co], None)

    # test that the config is applying defaults properly
    info = dict(uid=123, label="pants",
            n_lines=4, synapse=0)
    json_res = co.javascript_config(info)
    assert json.loads(json_res) == dict(uid=123, label="pants", x=0, y=0,
                                        width=100, height=100,
                                        label_visible=True, n_lines=4,
                                        synapse=0)

    # test that over-writing defaults throws an error
    with pytest.raises(AttributeError):
        info = dict(label_visible=False)
        json_res = co.javascript_config(info)
