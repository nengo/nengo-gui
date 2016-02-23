import json
import os

from nengo_gui.components.component import Component
import nengo_gui.exec_env


class AceEditor(Component):

    config_defaults = {}

    def __init__(self):
        # the IPython integration requires this component to be early
        # in the list
        super(AceEditor, self).__init__(component_order=-8)
        self.pending_messages = []

    def attach(self, page, config, uid):
        super(AceEditor, self).attach(page, config, uid)
        if page.gui.interactive:
            self.current_code = page.code
            self.serve_code = True
            self.last_error = None
            self.last_stdout = None

    def update_code(self, code):
        self.current_code = code
        self.serve_code = True

    def update_client(self, client):
        if not self.page.gui.interactive:
            return
        while self.pending_messages:
            client.write(self.pending_messages.pop())
        if self.serve_code:
            i = json.dumps({'code': self.current_code})
            client.write(i)
            self.serve_code = False
        if nengo_gui.exec_env.is_executing():
            return
        error = self.page.error
        stdout = self.page.stdout
        if error != self.last_error or stdout != self.last_stdout:
            if error is None:
                short_msg = None
            else:
                if '\n' in error['trace']:
                    short_msg = error['trace'].rsplit('\n', 2)[-2]
                else:
                    short_msg = error['trace']
            client.write(json.dumps({'error': error,
                                     'short_msg': short_msg,
                                     'stdout': stdout}))
            self.last_error = error
            self.last_stdout = stdout

    def javascript(self):
        args = json.dumps(dict(active=self.page.gui.interactive))
        return 'Nengo.ace = new Nengo.Ace("%s", %s)' % (id(self), args)

    def message(self, msg):
        if not self.page.gui.interactive:
            return
        data = json.loads(msg)
        self.current_code = data['code']

        save_as = data.get('save_as', None)
        if save_as is not None:
            if os.path.exists(save_as):
                msg = ("Could not rename to %s; "
                       "File already exists" % save_as)
                self.pending_messages.append(json.dumps(
                                             {'filename': save_as,
                                              'valid': False,
                                              'error': msg}))
            else:
                try:
                    self.page.filename_cfg = save_as + '.cfg'
                    self.page.save_config(force=True)
                    self.page.filename = save_as
                    with open(self.page.filename, 'w') as f:
                        f.write(self.current_code)
                    self.pending_messages.append(json.dumps(
                                                 {'filename': save_as,
                                                  'valid': True}))
                    self.page.net_graph.update_code(self.current_code)
                except IOError:
                    msg = "Could not save %s; permission denied" % save_as
                    self.pending_messages.append(json.dumps(
                                                 {'filename': save_as,
                                                  'valid': False,
                                                  'error': msg}))
        elif data['save']:
            try:
                with open(self.page.filename, 'w') as f:
                    f.write(self.current_code)
            except IOError:
                print("Could not save %s; permission denied" %
                      self.page.filename)
                self.page.net_graph.update_code(self.current_code)
        else:
            self.page.net_graph.update_code(self.current_code)
