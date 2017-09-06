from nengo.spa.module import Module

from .base import Component


class Network(Component):
    def __init__(self, client, net, uid):
        super(Network, self).__init__(client, uid, order=10)
        self.net = net

    @property
    def output(self):
        """Used in value plots"""
        if isinstance(self.net, Module) and "default" in self.net.outputs:
            return self.net.outputs["default"][0]
        elif hasattr(self.net, "output"):
            return self.net.output
        return self.net

    def create(self):
        # TODO: figure out args to pass to this
        self.client.send("netgraph.create_network")

    def similar(self, other):
        return (super(Network, self).similar(other)
                and self.default_output == other.default_output)

    def update(self, other):
        pass
