from .base import Component


class Ensemble(Component):

    @property
    def dimensions(self):
        return self.obj.dimensions

    @property
    def n_neurons(self):
        return self.obj.n_neurons

    def create(self):
        self.client.send("netgraph.create_ensemble",
                         uid=self.uid,
                         label=self.label,
                         pos=self.pos,
                         dimensions=self.dimensions,
                         labelVisible=self.label_visible)

    def similar(self, other):
        return (super(Ensemble, self).similar(other)
                and self.dimensions == other.dimensions
                and self.n_neurons == other.n_neurons)
