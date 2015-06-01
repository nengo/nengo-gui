import time

import nengo

from nengo_viz.components.component import Component, Template

class AceEditor(Component):
    def __init__(self, viz, config, uid):
        super(AceEditor, self).__init__(viz, config, uid)
        self.viz = viz
        self.current_code = 'hello world'
        self.uid = uid

    def javascript(self):
        return 'new VIZ.Ace("%s", "%s")' % (self.current_code, self.uid) ##feed VIZ.Ace a single string representing all the code for the model

    def message(self, msg):
        print('msg received');

class AceEditorTemplate(Template):
    cls = AceEditor
    config_params = dict(current_code = '')