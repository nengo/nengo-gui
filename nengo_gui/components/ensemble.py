from .base import Component


class Ensemble(Component):

    def __init__(self, client, ens, uid):
        super(Ensemble, self).__init__(client, uid, order=11)
        self.ens = ens

    @property
    def dimensions(self):
        return self.ens.dimensions

    @property
    def n_neurons(self):
        return self.ens.n_neurons

    def create(self):
        # TODO: figure out args to pass to this
        self.client.send("netgraph.create_ensemble")

    def similar(self, other):
        return (super(Ensemble, self).similar(other)
                and self.dimensions == other.dimensions
                and self.n_neurons == other.n_neurons)

    def update(self, other):
        pass
