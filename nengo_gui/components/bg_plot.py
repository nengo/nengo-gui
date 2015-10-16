import struct

import nengo
import numpy as np
import ipdb

from nengo_gui.components.value import Value


class BGPlot(Value):
    """The server-side system for the SPA Basal Ganglia plot."""

    # the parameters to be stored in the .cfg file
    config_defaults = Value.config_defaults
    config_defaults["palette_index"] = 1
    config_defaults["show_legend"] = True

    def __init__(self, obj, **kwargs):
        args = kwargs["args"]
        super(BGPlot, self).__init__(obj, args["n_lines"])

        # default legends to show
        self.def_legend_labels = args["legend_labels"]

        # the item to connect to
        self.probe_target = args["probe_target"]

        self.label = "bg " + self.probe_target

        # the binary data format to sent in.  In this case, it is a list of
        # floats, with the first float being the time stamp and the rest
        # being the vector values, one per dimension.
        self.struct = struct.Struct('<%df' % (1 + self.n_lines))

    def attach(self, page, config, uid):
        super(Value, self).attach(page, config, uid)

    def add_nengo_objects(self, page):
        # create a Node and a Connection so the Node will be given the
        # data we want to show while the model is running.
        with page.model:
            self.node = nengo.Node(self.gather_data,
                                   size_in=self.n_lines)
            if self.probe_target == "input":
                self.conn = nengo.Connection(self.obj.input, self.node, synapse=0.01)
            else:
                self.conn = nengo.Connection(self.obj.output, self.node, synapse=0.01)

    def javascript(self):
        # generate the javascript that will create the client-side object
        info = dict(uid=id(self), label=self.label, 
                    n_lines=self.n_lines, synapse=0)

        if getattr(self.config, "legend_labels") == []:
            json = self.javascript_config(info, override={"legend_labels":self.def_legend_labels})
        else:
            json = self.javascript_config(info)
        return 'new Nengo.Value(main, sim, %s);' % json