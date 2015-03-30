import json

class Component(object):
    def __init__(self, viz, config, uid):
        self.config = config
        self.uid = uid
    def update_client(self, client):
        pass
    def message(self, msg):
        print 'unhandled message', msg

    def finish(self):
        pass

    def remove_nengo_objects(self, viz):
        pass

    def javascript_config(self, cfg):
        for attr in self.config._clsparams.params:
            if self.config in self.config._clsparams.get_param(attr):
                cfg[attr] = getattr(self.config, attr)
        return json.dumps(cfg)
