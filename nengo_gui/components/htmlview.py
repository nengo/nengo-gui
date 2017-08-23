import collections

from nengo_gui.components.component import Component


class HTMLView(Component):
    """Arbitrary HTML display taking input from a Node

    See nengo_gui/examples/basics/html.py for example usage"""

    def __init__(self, obj):
        super(HTMLView, self).__init__()
        self.obj = obj
        self.obj_output = obj.output
        self.data = collections.deque()

    @property
    def label(self):
        return self.page.names.label(self.obj)

    def add_nengo_objects(self, network, config):
        with network:
            self.obj.output = self.gather_data

    def remove_nengo_objects(self, network):
        self.obj.output = self.obj_output

    def gather_data(self, t, *x):
        value = self.obj_output(t, *x)
        data = '%g %s' % (t, self.obj_output._nengo_html_)
        self.data.append(data)
        return value

    def update_client(self, client):
        while len(self.data) > 0:
            item = self.data.popleft()
            client.write_text(item)

    def javascript(self):
        info = dict(uid=id(self), label=self.label)
        json = self.javascript_config(info)
        return 'new HTMLView.default(nengo.main, nengo.sim, %s);' % json

    def code_python_args(self, uids):
        return [uids[self.obj]]
