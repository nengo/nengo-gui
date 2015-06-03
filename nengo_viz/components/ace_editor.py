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
        self.last_error = None

    def update_client(self, client):
        if self.serve_code:
            i = json.dumps({'code': self.current_code})
            client.write(i)
            self.serve_code = False
        error = self.viz.current_error
        if error != self.last_error:
            client.write(json.dumps({'error': error}))
            self.last_error = error

    def javascript(self):
        return 'ace_editor = new VIZ.Ace("%s")' % self.uid

    def message(self, msg):
        self.current_code = msg
        with open(self.viz.viz.filename, 'w') as f:
            f.write(self.current_code)

class AceEditorTemplate(Template):
    cls = AceEditor
    config_params = {}
