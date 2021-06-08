import struct

import nengo
from nengo import spa
from nengo_gui.components.component import Component


class Value(Component):
    """The server-side system for a Value plot."""

    # the parameters to be stored in the .cfg file
    config_defaults = dict(
        max_value=1,
        min_value=-1,
        show_legend=False,
        legend_labels=[],
        synapse=0.01,
        **Component.config_defaults,
    )

    def __init__(self, obj):
        super(Value, self).__init__()
        # the object whose decoded value should be displayed
        self.obj = obj

        # the pending data to be sent to the client
        self.data = []

        # grab the output of the object
        self.output = obj
        default_out = Value.default_output(self.obj)
        if default_out is not None:
            self.output = default_out

        # the number of data values to send
        self.n_lines = int(self.output.size_out)

        # the binary data format to sent in.  In this case, it is a list of
        # floats, with the first float being the time stamp and the rest
        # being the vector values, one per dimension.
        self.struct = struct.Struct("<%df" % (1 + self.n_lines))

        # Nengo objects for data collection
        self.node = None
        self.conn = None

    def attach(self, page, config, uid):
        super(Value, self).attach(page, config, uid)
        # use the label of the object being plotted as our label
        self.label = page.get_label(self.obj)

    def add_nengo_objects(self, page):
        # create a Node and a Connection so the Node will be given the
        # data we want to show while the model is running.
        with page.model:
            self.node = nengo.Node(self.gather_data, size_in=self.n_lines)
            synapse = self.page.config[self].synapse
            self.conn = nengo.Connection(self.output, self.node, synapse=synapse)

    def remove_nengo_objects(self, page):
        # undo the changes made by add_nengo_objects
        page.model.connections.remove(self.conn)
        page.model.nodes.remove(self.node)

    def gather_data(self, t, x):
        """This is the Node function for the Node created in add_nengo_objects
        It will be called by the running model, and will store the data
        that should be sent to the client"""
        self.data.append(self.struct.pack(t, *x))

    def update_client(self, client):
        length = len(self.data)
        if length > 0:
            # we do this slicing because self.gather_data is concurrently
            # appending things to self.data.  This means that self.data may
            # increase in length during this call, so we do the slicing
            # and deletion to maintain thread safety
            item = bytes().join(self.data[:length])
            del self.data[:length]
            client.write_binary(item)

    def javascript(self):
        # generate the javascript that will create the client-side object
        info = dict(uid=id(self), label=self.label, n_lines=self.n_lines)

        json = self.javascript_config(info)
        return "new Nengo.Value(main, sim, %s);" % json

    def code_python_args(self, uids):
        # generate the list of strings for the .cfg file to save this Component
        # (this is the text that would be passed in to the constructor)
        return [uids[self.obj]]

    def message(self, msg):
        if msg.startswith("synapse:"):
            synapse = float(msg[8:])
            self.page.config[self].synapse = synapse
            self.page.modified_config()
            self.page.sim = None

    @staticmethod
    def default_output(obj):
        """Find default output object for the input object if it exists"""
        output = None
        if isinstance(obj, spa.module.Module):
            if "default" in obj.outputs.keys():
                output = obj.outputs["default"][0]
        elif isinstance(obj, nengo.network.Network):
            if hasattr(obj, "output"):
                output = obj.output
        return output
