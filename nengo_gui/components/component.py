import json

class Component(object):
    def __init__(self, page, config, uid, component_order=0):
        self.config = config
        self.uid = uid
        self.page = page
        # the order this component will be defined in the javascript
        self.component_order = component_order
        self.replace_with = None

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


class Template(object):
    default_params = dict(x=0, y=0, width=100, height=100, label_visible=True)
    cls = None   # subclasses are expected to set this to be the class of
                 # the object that should be created.

    def __init__(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs
    def create(self, page):
        uid = '_uid_%d' % id(self)
        c = self.cls(page, page.config[self], uid,
                     *self.args, **self.kwargs)
        c.template = self
        return c
    def code_python(self, uids):
        args = [uids[x] for x in self.args]
        name = self.__class__.__name__
        return 'nengo_gui.components.%s(%s)' % (name, ','.join(args))
