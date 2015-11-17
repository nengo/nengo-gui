import struct

import nengo
import numpy as np

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
            self.config.legend_labels = self.def_legend_labels

        json = self.javascript_config(info)
        return 'new Nengo.Value(main, sim, %s);' % json

    def code_python_args(self, uids):
        return [
                uids[self.obj],
                ' args=dict(n_lines=%s, legend_labels=%s, probe_target="%s")'
                % (self.n_lines, self.config.legend_labels, self.probe_target,)
                ]
