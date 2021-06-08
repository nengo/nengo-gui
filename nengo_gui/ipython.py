import warnings

warnings.warn(
    DeprecationWarning("nengo_gui.ipython has been renamed to nengo_gui.jupyter.")
)

from nengo_gui.jupyter import *
