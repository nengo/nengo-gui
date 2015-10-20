import struct

import nengo
import numpy as np

from nengo_gui.components.value import Value


class CompPlot(Value):
    """The server-side system for the SPA Compare plot."""

    # the parameters to be stored in the .cfg file
    config_defaults = Value.config_defaults

    def __init__(self, obj, **kwargs):
        super(CompPlot, self).__init__(obj, n_lines=1)

    def add_nengo_objects(self, page):
        # create a Node and a Connection so the Node will be given the
        # data we want to show while the model is running.
        with page.model:
            self.node = nengo.Node(self.gather_data, size_in=1)
            self.conn = nengo.Connection(self.obj.output, self.node, synapse=0.01)