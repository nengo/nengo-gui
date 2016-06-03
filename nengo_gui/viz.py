import warnings

import nengo_gui.gui


# dummy fn so that old scripts still work, but get a deprecation message
def Viz(*args, **kwargs):
    warnings.warn("nengo_gui.Viz is deprecated. Use nengo_gui.GUI instead.")
    return nengo_gui.GUI(*args, **kwargs)
