import time

import numpy as np
import nengo

from nengo_viz.components.component import Component

class TimeControl(Component):
    def __init__(self, viz, **kwargs):
        super(TimeControl, self).__init__(viz, **kwargs)
        with viz.model:
            self.node = nengo.Node(self.control, size_out=0)
        self.paused = False

    def control(self, t):
        while self.paused:
            time.sleep(0.01)

    def javascript(self):
        return ('new VIZ.TimeControl({parent:control, '
                'x:%(x)g, y:%(x)g, '
                'width:%(width)g, height:%(height)g, id:%(id)d});' %
                dict(x=self.x, y=self.y, width=self.width, height=self.height,
                 id=id(self)))

    def message(self, msg):
        if msg == 'pause':
            self.paused = True
        elif msg == 'continue':
            self.paused = False
