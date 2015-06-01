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
    		counter = 1
    		for i in self.current_code:
    			i = json.dumps({'line': counter, 'data': i})
    			print('told client', i)
    			client.write(i)
    			counter = counter + 1
    		self.serve_code = False

    def javascript(self):
        return 'new VIZ.Ace("%s", "%s")' % ('stringified', self.uid) ##feed VIZ.Ace a single string representing all the code for the model

    def message(self, msg):
        self.current_code = msg
        print(self.current_code)

class AceEditorTemplate(Template):
    cls = AceEditor
    config_params = {}