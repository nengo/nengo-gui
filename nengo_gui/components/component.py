import json

class Component(object):
    default_params = dict(x=0, y=0, width=100, height=100, label_visible=True)

    def __init__(self, component_order=0):
        # the order this component will be defined in the javascript
        self.component_order = component_order
        self.replace_with = None

    def initialize(self, page, config, uid):
        self.config = config
        self.page = page
        self.uid = uid

    def update_client(self, client):
        pass
    def message(self, msg):
        print('unhandled message', msg)

    def finish(self):
        pass

    def add_nengo_objects(self, page):
        pass

    def remove_nengo_objects(self, page):
        pass

    def javascript_config(self, cfg):
        for attr in self.config._clsparams.params:
            cfg[attr] = getattr(self.config, attr)
        return json.dumps(cfg)

    def code_python_args(self, uids):
        return []

    def code_python(self, uids):
        args = self.code_python_args(uids)
        name = self.__class__.__name__
        return 'nengo_gui.components.%s(%s)' % (name, ','.join(args))
