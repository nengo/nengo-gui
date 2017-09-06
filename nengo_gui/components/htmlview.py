import collections

from .base import Widget


class HTMLView(Widget):
    """Arbitrary HTML display taking input from a Node

    See nengo_gui/examples/basics/html.py for example usage.
    """

    def __init__(self, client, obj, uid, pos=None, label=None):
        super(HTMLView, self).__init__(
            client, uid, order=0, pos=pos, label=label)
        self.obj = obj
        self.data = collections.deque()

    @property
    def label(self):
        return self.page.names.label(self.obj)

    def add_nengo_objects(self, model):

        def fast_send_to_client(t, *x):


        with model:
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
