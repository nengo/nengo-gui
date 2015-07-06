import json

import nengo

from nengo_gui.components.component import Component, Template
import nengo_gui.exec_env

class AceEditor(Component):
    def __init__(self, sim, config, uid):
        # the IPython integration requires this component to be early
        # in the list
        super(AceEditor, self).__init__(sim, config, uid, component_order=-8)
        self.sim = sim
        self.uid = uid
        if self.sim.sim_server.interactive:
            self.current_code = self.sim.code
            self.serve_code = True
            self.last_error = None
            self.last_stdout = None

    def update_code(self, code):
        self.current_code = code
        self.serve_code = True

    def update_client(self, client):
        if not self.sim.sim_server.interactive:
            return
        if self.serve_code:
            i = json.dumps({'code': self.current_code})
            client.write(i)
            self.serve_code = False
        if nengo_gui.exec_env.is_executing():
            return
        error = self.sim.error
        stdout = self.sim.stdout
        if error != self.last_error or stdout != self.last_stdout:
            if error is None:
                short_msg = None
            else:
                if '\n' in error['trace']:
                    short_msg = error['trace'].rsplit('\n', 2)[-2]
                else:
                    short_msg = error['trace']
            client.write(json.dumps({'error': error,
                                     'short_msg':short_msg,
                                     'stdout':stdout}))
            self.last_error = error
            self.last_stdout = stdout

    def javascript(self):
        args = json.dumps(dict(active=self.sim.sim_server.interactive))
        return 'ace_editor = new Nengo.Ace("%s", %s)' % (self.uid, args)

    def message(self, msg):
        if not self.sim.sim_server.interactive:
            return
        data = json.loads(msg)
        self.current_code = data['code']

        if data['save']:
            try:
                with open(self.sim.filename, 'w') as f:
                    f.write(self.current_code)
            except IOError:
                print("Could not save %s; permission denied" %
                      self.sim.filename)
                self.sim.net_graph.update_code(self.current_code)
        else:
            self.sim.net_graph.update_code(self.current_code)


class AceEditorTemplate(Template):
    cls = AceEditor
    config_params = {}
