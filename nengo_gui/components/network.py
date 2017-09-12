from nengo.spa.module import Module

from .base import Component


class Network(Component):

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
