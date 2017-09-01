from .base import Component
from .slider import OverriddenOutput


class Node(Component):
    def __init__(self, client, node, uid):
        super(Node, self).__init__(client, uid, order=12)
        self.node = node

    @property
    def dimensions(self):
        return self.node.size_out

    @property
    def html(self):
        return (callable(self.node.output)
                and hasattr(self.node.output, '_nengo_html_'))

    @property
    def passthrough(self):
        return self.node.output is None or (
            isinstance(self.node.output, OverriddenOutput)
            and self.node.output.base_output is None)

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
