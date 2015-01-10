import numpy as np

from nengo_viz.components.component import Component

class Slider(Component):
    def __init__(self, viz, node, **kwargs):
        super(Slider, self).__init__(viz, **kwargs)
        self.node = node
        self.base_output = node.output
        node.output = self.override_output
        self.override = [None] * node.size_out
        self.value = np.zeros(node.size_out)

    def override_output(self, t, *args):
        if callable(self.base_output):
            self.value[:] = self.base_output(t, *args)
        else:
            self.value[:] = self.base_output

        for i, v in enumerate(self.override):
            if v is not None:
                self.value[i] = v
        return self.value

    def javascript(self):
        return ('new VIZ.Slider({parent:main, n_sliders:%(n_sliders)d, '
                'x:%(x)g, y:%(x)g, '
                'width:%(width)g, height:%(height)g, id:%(id)d});' %
                dict(x=self.x, y=self.y, width=self.width, height=self.height,
                 n_sliders=len(self.override), id=id(self)))

    def message(self, msg):
        index, value = msg.split(',')
        index = int(index)
        value = float(value)
        self.override[index] = value
