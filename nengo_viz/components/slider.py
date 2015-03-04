import numpy as np

from nengo_viz.components.component import Component

class Slider(Component):
    def __init__(self, viz, node, min_value=-1, max_value=1, **kwargs):
        super(Slider, self).__init__(viz, **kwargs)
        self.node = node
        self.base_output = node.output
        node.output = self.override_output
        self.override = [None] * node.size_out
        self.value = np.zeros(node.size_out)
        self.min_value = min_value
        self.max_value = max_value
        self.label = viz.viz.get_label(node)
        self.start_value = np.zeros(node.size_out)
        if not callable(self.base_output):
            self.start_value[:] = self.base_output

    def remove_nengo_objects(self, viz):
        self.node.output = self.base_output

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
                'x:%(x)g, y:%(y)g, label:%(label)s, '
                'width:%(width)g, height:%(height)g, id:%(id)d, '
                'min_value:%(min_value)g, max_value:%(max_value)g, '
                'start_value:%(start_value)s});' %
                dict(x=self.x, y=self.y, width=self.width, height=self.height,
                 n_sliders=len(self.override), id=id(self), label=`self.label`,
                 min_value=self.min_value, max_value=self.max_value,
                 start_value=[float(x) for x in self.start_value]))

    def message(self, msg):
        index, value = msg.split(',')
        index = int(index)
        value = float(value)
        self.override[index] = value
