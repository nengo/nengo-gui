import inspect
import sys

from .component import Component
from .slider import Slider
from .value import Value
from .xyvalue import XYValue
from .sim_control import SimControl
from .raster import Raster
from .voltage import Voltage
from .pointer import Pointer
from .netgraph import NetGraph
from .ace_editor import AceEditor

# Old versions of the .cfg files used Templates which had slightly different
# names than the Components currently usef.  This code is needed to
# successfully parse those old .cfg files
this_module = sys.modules[__name__]
for name, obj in inspect.getmembers(this_module, inspect.isclass):
    if issubclass(obj, Component):
        setattr(this_module, name + 'Template', obj)
