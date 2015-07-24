from value import Value

class SpaSimilarity(Value):

    def javascript():
        info = dict(uid=id(self), label=self.label,
                    n_lines=self.n_lines, synapse=0)
        json = self.javascript_config(info)
        return 'new Nengo.SpaSimilarity(main, sim, %s);' % json