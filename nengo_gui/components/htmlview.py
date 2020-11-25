import collections

from nengo_gui.components.component import Component


class HTMLView(Component):
    """Arbitrary HTML display taking input from a Node

    See nengo_gui/examples/basics/html.py for example usage.

    The HTML is given by a string, stored in the attribute ``_nengo_html_``
    on the output function of the nengo Node. To make the HTML static
    (served once instead of every timestep), add the attribute
    ``_nengo_static_`` to the node's output function.
    """

    def __init__(self, obj):
        super(HTMLView, self).__init__()
        self.obj = obj
        self.obj_output = obj.output
        self.data = collections.deque()
        self.is_static = hasattr(self.obj_output, '_nengo_static_')
        if self.is_static:
            self.data.append('%g %s' % (0, self.obj_output._nengo_html_))

    def attach(self, page, config, uid):
        super(HTMLView, self).attach(page, config, uid)
        self.label = page.get_label(self.obj)

    def add_nengo_objects(self, page):
        with page.model:
            self.obj.output = self.gather_data

    def remove_nengo_objects(self, page):
        self.obj.output = self.obj_output

    def gather_data(self, t, *x):
        value = self.obj_output(t, *x)
        if not self.is_static:
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
        return 'new Nengo.HTMLView(main, sim, %s);' % json

    def code_python_args(self, uids):
        return [uids[self.obj]]
