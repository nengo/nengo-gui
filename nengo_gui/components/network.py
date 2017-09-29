from nengo.spa.module import Module

from .base import Component


class Network(Component):

    def __init__(self, client, obj, uid,
                 pos=None, label=None, expanded=False, has_layout=False):
        super(Network, self).__init__(client, obj, uid, pos, label)
        self.expanded = expanded
        self.has_layout = has_layout

    @property
    def output(self):
        """Used in value plots"""
        if isinstance(self.obj, Module) and "default" in self.obj.outputs:
            return self.obj.outputs["default"][0]
        elif hasattr(self.obj, "output"):
            return self.obj.output
        return None

    def create(self):
        # TODO: figure out args to pass to this
        self.client.send("netgraph.create_network")

    def similar(self, other):
        return (super(Network, self).similar(other)
                and self.output == other.output)
