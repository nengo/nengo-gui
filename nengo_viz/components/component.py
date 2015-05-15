import json
import functools

class Template(object):
    def __init__(self, cls, *args):
        self.cls = cls
        self.args = args
    def create(self, vizsim):
        uid = vizsim.viz.get_uid(self)
        c = self.cls(vizsim, vizsim.viz.config[self], uid, *self.args)
        c.template = self
        return c
    def code_python(self, uids):
        args = [uids[x] for x in self.args]
        return 'nengo_viz.%s(%s)' % (self.cls.__name__, ','.join(args))


class Component(object):
    def __init__(self, viz, config, uid):
        self.config = config
        self.uid = uid
    def update_client(self, client):
        pass
    def message(self, msg):
        print('unhandled message', msg)

    def finish(self):
        pass

    def add_nengo_objects(self, viz):
        pass

    def remove_nengo_objects(self, viz):
        pass

    def javascript_config(self, cfg):
        for attr in self.config._clsparams.params:
            cfg[attr] = getattr(self.config, attr)
        return json.dumps(cfg)
