import warnings

import nengo_gui.sim_server


# dummy class so that old scripts still work, but get a deprecation message
class Viz(nengo_gui.sim_server.SimServer):
    def __init__(self, *args, **kwargs):
        warnings.warn("nengo_gui.Viz is deprecated.  "
                      "Use nengo_gui.SimServer instead.")
        super(Viz, self).__init__(*args, **kwargs)
