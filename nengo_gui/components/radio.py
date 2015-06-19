import numpy as np

from nengo_gui.components.component import Component, Template

class Radio(Component):
    def __init__(self, viz, config, uid, node):
        super(Radio, self).__init__(viz, config, uid)
        self.node = node
        self.options = ['hallo', 'hi again']
        self.override = [None] * len(self.options)
        self.value = np.zeros(len(self.options))
        self.label = viz.viz.get_label(node)
        print(self.value)

    def add_nengo_objects(self, viz):
        pass

    def remove_nengo_objects(self, viz):
        pass

    def override_output(self, t, *args):
        return self.value

    def javascript(self):
        info = dict(uid=self.uid, label=self.label, options=self.options)
        json = self.javascript_config(info)
        return 'new Nengo.Radio(main, sim, %s);' % json


    def update_client(self, client):
        pass

    def toggle_checked(self, index):
        if self.value[index] == 0:
            self.value[index] = 1;
        elif self.value[index] == 1:
            self.value[index] = 0;

    def message(self, msg):
        print(msg)
        self.toggle_checked(int(msg))
        print(self.value)



class RadioTemplate(Template):
    cls = Radio
    config_params = dict( **Template.default_params)
