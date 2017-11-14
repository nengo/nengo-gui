from .base import Component


class HTMLView(Component):
    """Arbitrary HTML display taking input from a Node.

    See nengo_gui/examples/basics/html.py for example usage.

    Note that, because the HTML to send across the websocket is text, this
    component is not a widget as it does not benefit from a fast binary
    websocket connection.
    """

    def __init__(self, client, obj, uid, pos=None, label=None):
        super(HTMLView, self).__init__(client, obj, uid, pos=pos, label=label)
        self._old_output = None

    def add_nengo_objects(self, model):

        def send_to_client(t, *x):
            value = self._old_output(t, *x)
            self.client.send("%s.html" % (self.uid,),
                             t=t, html=self._old_output._nengo_html_)
            return value

        self._old_output = self.obj.output
        self.obj.output = send_to_client

    def create(self):
        self.client.send("netgraph.create_htmlview",
                         uid=self.uid,
                         pos=self.pos,
                         dimensions=1,  # TODO
                         syanpse=0.005)  # TODO

    def remove_nengo_objects(self, network):
        self.obj.output = self._old_output
        self._old_output = None
