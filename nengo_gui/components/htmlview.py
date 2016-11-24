import collections

import nengo

from nengo_gui.components.component import Component


class BaseHTMLView(Component):
    """Arbitrary HTML display taking input from a Node

    See nengo_gui/examples/basics/html.py for example usage"""

    def __init__(self, obj):
        super(BaseHTMLView, self).__init__()
        self.data = collections.deque()
        self.obj = obj
        assert isinstance(self.obj, nengo.Node)

    def attach(self, page, config, uid):
        super(BaseHTMLView, self).attach(page, config, uid)
        self.label = page.get_label(self.obj)

    def _append_data(self, t, html):
        self.data.append('%g %s' % (t, html))

    def update_client(self, client):
        while len(self.data) > 0:
            data = self.data.popleft()
            client.write_text(data)

    def javascript(self):
        info = dict(uid=id(self), label=self.label)
        json = self.javascript_config(info)
        return 'new Nengo.HTMLView(main, sim, %s);' % json

    def code_python_args(self, uids):
        return [uids[self.obj]]


class AttributeHTMLView(BaseHTMLView):
    """Display HTML from a Node that writes to ``output._nengo_html_``

    See nengo_gui/examples/basics/html.py for example usage"""

    def __init__(self, obj):
        super(AttributeHTMLView, self).__init__(obj)
        self.obj_output = self.obj.output
        assert callable(self.obj_output)

    def add_nengo_objects(self, page):
        self.obj.output = self.gather_data

    def remove_nengo_objects(self, page):
        self.obj.output = self.obj_output

    def gather_data(self, t, *x):
        value = self.obj_output(t, *x)
        self._append_data(t, self.obj_output._nengo_html_)
        return value


class CallableHTMLView(BaseHTMLView):
    """Display HTML from a Node with a callable ``output._nengo_html_``
    """

    def __init__(self, obj):
        super(CallableHTMLView, self).__init__(obj)
        assert self.obj.size_out > 0

    def add_nengo_objects(self, page):
        with page.model:
            self.node = nengo.Node(self.gather_data, size_in=self.obj.size_out)
            self.conn = nengo.Connection(self.obj, self.node, synapse=None)

    def remove_nengo_objects(self, page):
        page.model.connections.remove(self.conn)
        page.model.nodes.remove(self.node)

    def gather_data(self, t, *x):
        html = self.obj.output._nengo_html_(t, *x)
        self._append_data(t, html)


def HTMLView(obj):
    if callable(obj.output._nengo_html_):
        return CallableHTMLView(obj)
    else:
        return AttributeHTMLView(obj)
