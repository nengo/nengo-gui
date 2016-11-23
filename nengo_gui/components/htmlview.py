import collections

import nengo

from nengo_gui.components.component import Component


class HTMLView(Component):
    """Arbitrary HTML display taking input from a Node

    See nengo_gui/examples/basics/html.py for example usage"""

    def __init__(self, obj):
        super(HTMLView, self).__init__()
        self.obj = obj
        self.data = collections.deque()
        self.html_function = getattr(obj.output, '_nengo_html_function_')

    def attach(self, page, config, uid):
        super(HTMLView, self).attach(page, config, uid)
        self.label = page.get_label(self.obj)

    def add_nengo_objects(self, page):
        with page.model:
            self.node = nengo.Node(self.gather_data, size_in=self.obj.size_out)
            self.conn = nengo.Connection(self.obj, self.node, synapse=None)

    def remove_nengo_objects(self, page):
        page.model.connections.remove(self.conn)
        page.model.nodes.remove(self.node)

    def gather_data(self, t, x):
        self.data.append((t, self.html_function(t, x)))

    def update_client(self, client):
        while len(self.data) > 0:
            t, html = self.data.popleft()
            out = '%g %s' % (t, html)
            client.write_text(out)

    def javascript(self):
        info = dict(uid=id(self), label=self.label)
        json = self.javascript_config(info)
        return 'new Nengo.HTMLView(main, sim, %s);' % json

    def code_python_args(self, uids):
        return [uids[self.obj]]
