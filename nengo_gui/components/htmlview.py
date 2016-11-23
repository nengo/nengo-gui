import collections

import nengo

from nengo_gui.components.component import Component


class HTMLView(Component):
    """Arbitrary HTML display taking input from a Node

    See nengo_gui/examples/basics/html.py for example usage"""

    def __init__(self, obj):
        super(HTMLView, self).__init__()
        self.data = collections.deque()

        self.obj = obj
        self.obj_output = self.obj.output
        self.callable_html = callable(obj.output._nengo_html_)
        if self.callable_html:
            assert self.obj.size_out > 0
        else:
            assert callable(self.obj_output)

    def attach(self, page, config, uid):
        super(HTMLView, self).attach(page, config, uid)
        self.label = page.get_label(self.obj)

    def add_nengo_objects(self, page):
        if self.callable_html:
            with page.model:
                self.node = nengo.Node(
                    self.gather_data, size_in=self.obj.size_out)
                self.conn = nengo.Connection(self.obj, self.node, synapse=None)
        else:
            self.obj.output = self.gather_data

    def remove_nengo_objects(self, page):
        if self.callable_html:
            page.model.connections.remove(self.conn)
            page.model.nodes.remove(self.node)
        else:
            self.obj.output = self.obj_output

    def gather_data(self, t, *x):
        if self.callable_html:
            value = None
            html = self.obj_output._nengo_html_(t, *x)
        else:
            value = self.obj_output(t, *x)
            html = self.obj_output._nengo_html_

        self.data.append('%g %s' % (t, html))
        return value

    def update_client(self, client):
        while len(self.data) > 0:
            client.write_text(self.data.popleft())

    def javascript(self):
        info = dict(uid=id(self), label=self.label)
        json = self.javascript_config(info)
        return 'new Nengo.HTMLView(main, sim, %s);' % json

    def code_python_args(self, uids):
        return [uids[self.obj]]
