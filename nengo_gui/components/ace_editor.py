import json

import nengo

from nengo_gui.components.component import Component, Template
import nengo_gui.monkey

class AceEditor(Component):
    def __init__(self, viz, config, uid):
        super(AceEditor, self).__init__(viz, config, uid)
        self.viz = viz
        self.uid = uid
        if self.viz.viz.interactive:
            self.current_code = self.viz.viz.code
            self.serve_code = True
            self.last_error = None
            self.last_stdout = None

    def update_client(self, client):
        if not self.viz.viz.interactive:
            return
        if self.serve_code:
            i = json.dumps({'code': self.current_code})
            client.write(i)
            self.serve_code = False
        if nengo_gui.monkey.is_executing():
            return
        error = self.viz.current_error
        stdout = nengo_gui.monkey.patch.stdout.getvalue()
        if error != self.last_error or stdout != self.last_stdout:
            if error is None:
                short_msg = None
            else:
                short_msg = error['trace'].rsplit('\n', 2)[-2]
            client.write(json.dumps({'error': error,
                                     'short_msg':short_msg,
                                     'stdout':stdout}))
            self.last_error = error
            self.last_stdout = stdout

    def javascript(self):
        args = json.dumps(dict(active=self.viz.viz.interactive))
        return 'ace_editor = new Nengo.Ace("%s", %s)' % (self.uid, args)

    def message(self, msg):
        if not self.viz.viz.interactive:
            return
        data = json.loads(msg)
        self.current_code = data['code']

        if data['save']:
            try:
                with open(self.viz.viz.filename, 'w') as f:
                    f.write(self.current_code)
            except IOError:
                print("Could not save %s; permission denied" %
                      self.viz.viz.filename)
                self.viz.new_code = self.current_code
        else:
            self.viz.new_code = self.current_code


class AceEditorTemplate(Template):
    cls = AceEditor
    config_params = {}
