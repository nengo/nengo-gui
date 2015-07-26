from value import Value

class SpaSimilarity(Value):

    def __init__(self, obj, args):
        super(SpaSimilarity, self).__init__(obj)
        # the object whose decoded value should be displayed
        self.obj = obj
        # it's a buffer object!

        # the pending data to be sent to the client
        self.data = collections.deque()

        # the number of data values to send
        self.n_keys = len(obj.outputs[args][1].keys)

        # the binary data format to sent in.  In this case, it is a list of
        # floats, with the first float being the time stamp and the rest
        # being the vector values, one per dimension.
        self.struct = struct.Struct('<%df' % (1 + self.n_lines))

    def javascript():
        info = dict(uid=id(self), label=self.label,
                    n_keys=self.n_keys, synapse=0)
        json = self.javascript_config(info)
        return 'new Nengo.SpaSimilarity(main, sim, %s);' % json