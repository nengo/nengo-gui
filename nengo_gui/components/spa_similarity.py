from pointer import Pointer

class SpaSimilarity(Pointer):

    def __init__(self, obj, kwargs):
        super(SpaSimilarity, self).__init__(obj, kwargs)

    def javascript():
        info = dict(uid=id(self), label=self.label,
                    n_keys=self.n_keys, synapse=0)
        json = self.javascript_config(info)
        return 'new Nengo.SpaSimilarity(main, sim, %s);' % json

    def message(self, msg):
        """This should never be called."""
        raise AttributeError("You can't set the value of a plot!")
