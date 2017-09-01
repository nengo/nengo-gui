# flake8: noqa
from .base import Component
from .slider import Slider
from .value import Value
from .xyvalue import XYValue
from .raster import Raster
from .voltage import Voltage
from .pointer import Pointer
from .spa_similarity import SpaSimilarity
from .htmlview import HTMLView
from .spike_grid import SpikeGrid

from .connection import Connection
from .ensemble import Ensemble
from .network import Network
from .node import Node

# Old versions of the .cfg files used Templates which had slightly different
# names than the Components currently use.  This code allows us to
# successfully parse those old .cfg files
SliderTemplate = Slider
ValueTemplate = Value
XYValueTemplate = XYValue
RasterTemplate = Raster
VoltageTemplate = Voltage
PointerTemplate = Pointer
