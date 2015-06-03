import nengo
import json
from nengo_viz.components.component import Component, Template

class AceEditor(Component):
    def __init__(self, viz, config, uid):
        super(AceEditor, self).__init__(viz, config, uid)
        self.viz = viz
        self.uid = uid
        self.current_code = self.viz.viz.code
        self.serve_code = True

    def update_client(self, client):
    	if self.serve_code:
    		i = json.dumps({'code': self.current_code})
    		client.write(i)
    		self.serve_code = False

    def javascript(self):
        return 'ace_editor = new VIZ.Ace("%s", "%s")' % ('stringified', self.uid) ##feed VIZ.Ace a single string representing all the code for the model

    def message(self, msg):
        self.current_code = msg
        with open(self.viz.viz.filename, 'w') as f:
            f.write(self.current_code)

class AceEditorTemplate(Template):
    cls = AceEditor
    config_params = {}