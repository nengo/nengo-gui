from nengo_gui.components.component import Component

def test_javascript_config():
    # test that the config is applying defaults properly
    info = dict(uid=123, label="pants",
                n_lines=4, synapse=0)
    co = Component()
    json = co.javascript_config(info)