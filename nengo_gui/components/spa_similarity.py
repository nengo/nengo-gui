from pointer import Pointer

class SpaSimilarity(Pointer):

    def __init__(self, obj, **kwargs):
        super(SpaSimilarity, self).__init__(obj, **kwargs)
        # I'll eventually have to learn how to switch from showing pairs
        # Probably by rebuilding the whole graph
        this.n_lines

    def javascript(self):
        # Do I really need n-keys?
        info = dict(uid=id(self), label=self.label,
                    n_keys=self.n_lines, synapse=0)
        json = self.javascript_config(info)
        return 'new Nengo.SpaSimilarity(main, sim, %s);' % json

    def message(self, msg):
        """This should never be called."""
        raise AttributeError("You can't set the value of a plot!")
