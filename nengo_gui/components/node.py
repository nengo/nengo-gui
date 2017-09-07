from .base import Component
from .slider import OverriddenOutput


class Node(Component):

    @property
    def dimensions(self):
        return self.obj.size_out

    @property
    def html(self):
        return (callable(self.obj.output)
                and hasattr(self.obj.output, '_nengo_html_'))

    @property
    def passthrough(self):
        return self.obj.output is None or (
            isinstance(self.obj.output, OverriddenOutput)
            and self.obj.output.base_output is None)

    def create(self):
        # TODO: figure out args to pass to this
        self.client.send("netgraph.create_node")

    def similar(self, other):
        return (super(Node, self).similar(other)
                and self.dimensions == other.dimensions
                and self.passthrough == other.passthrough
                and self.html == other.html)

    def update(self, other):
        pass
