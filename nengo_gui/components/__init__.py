# flake8: noqa
from .ace_editor import AceEditor
from .component import Component
from .editor import NoEditor
from .htmlview import HTMLView
from .netgraph import NetGraph
from .pointer import Pointer
from .progress import Progress
from .raster import Raster
from .sim_control import SimControl
from .slider import Slider
from .spa_similarity import SpaSimilarity
from .spike_grid import SpikeGrid
from .value import Value
from .voltage import Voltage
from .xyvalue import XYValue

# Old versions of the .cfg files used Templates which had slightly different
# names than the Components currently use.  This code allows us to
# successfully parse those old .cfg files
SliderTemplate = Slider
ValueTemplate = Value
XYValueTemplate = XYValue
SimControlTemplate = SimControl
RasterTemplate = Raster
VoltageTemplate = Voltage
PointerTemplate = Pointer
NetGraphTemplate = NetGraph
AceEditorTemplate = AceEditor
