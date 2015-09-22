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
from .spa_similarity import SpaSimilarity
from .htmlview import HTMLView
from .spike_grid import SpikeGrid

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
