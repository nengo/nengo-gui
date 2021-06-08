import json


class Component(object):
    """Abstract handler for a particular Component of the user interface.

    Each part of the user interface has part of the code on the server-side
    (in Python) and a part on the client-side (in Javascript).  These two sides
    communicate via WebSockets, and the server-side is always a subclass of
    Component.

    Each Component can be configured via the nengo.Config system.  Components
    can add required nengo objects into the model to allow them to gather
    required data or input overriding data (in the case of Pointer and Slider)
    to/from the running model.  Communication from server to
    client is done via Component.update_client(), which is called regularly
    by the Server.ws_viz_component handler.  Communication from client to
    server is via Component.message().
    """

    # The parameters that will be stored in the .cfg file for this Component
    # Subclasses should override this as needed.
    config_defaults = dict(x=0, y=0, width=100, height=100, label_visible=True)

    def __init__(self, component_order=0):
        # when generating Javascript for all the Components in a Page, they
        # will be sorted by component_order.  This way some Components can
        # be defined before others.
        self.component_order = component_order

        # If we have reloaded the model (while typing in the editor), we need
        # to swap out the old Component with the new one.
        self.replace_with = None

        # If we have been swapped out, keep track of the id of the original
        # component, since that's the identifier needed to refer to it on
        # the client side
        self.original_id = id(self)

    def attach(self, page, config, uid):
        """Connect the Component to a Page."""
        self.config = config  # the nengo.Config[component] for this component
        self.page = page  # the Page this component is in
        self.uid = uid  # The Python string referencing this component

    def update_client(self, client):
        """Send any required information to the client.

        This method is called regularly by Server.ws_viz_component().  You
        send text data to the client-side via a WebSocket as follows:
            client.write_text(data)
        You send binary data as:
            client.write_binary(data)
        """
        pass

    def message(self, msg):
        """Receive data from the client.

        Any data sent by the client ove the WebSocket will be passed into
        this method.
        """
        print("unhandled message", msg)

    def finish(self):
        """Close this Component"""
        pass

    def add_nengo_objects(self, page):
        """Add or modify the nengo model before build.

        Components may need to modify the underlying nengo.Network by adding
        Nodes and Connections or modifying the structure in other ways.
        This method will be called for all Components just before the build
        phase.
        """
        pass

    def remove_nengo_objects(self, page):
        """Undo the effects of add_nengo_objects.

        After the build is complete, remove the changes to the nengo.Network
        so that it is all set to be built again in the future.
        """
        pass

    def javascript_config(self, cfg):
        """Convert the nengo.Config information into javascript.

        This is needed so we can send that config information to the client.
        """
        for attr in self.config._clsparams.params:
            if attr in cfg:
                raise AttributeError(
                    "Value for %s is already set in the "
                    "config of this component. Do not try to "
                    "modify it via this function. Instead "
                    "modify the config directly." % (attr)
                )
            else:
                cfg[attr] = getattr(self.config, attr)
        return json.dumps(cfg)

    def code_python(self, uids):
        """Generate Python code for this Component.

        This is used in the .cfg file to generate a valid Python expression
        that re-creates this Component.

        The input uids is a dictionary from Python objects to strings that
        refer to those Python objects (the reverse of the locals() dictionary)
        """
        args = self.code_python_args(uids)
        name = self.__class__.__name__
        return "nengo_gui.components.%s(%s)" % (name, ",".join(args))

    def code_python_args(self, uids):
        """Return a list of strings giving the constructor arguments.

        This is used by code_python to re-create the Python string that
        generated this Component, so it can be saved in the .cfg file.

        The input uids is a dictionary from Python objects to strings that
        refer to those Python objects (the reverse of the locals() dictionary)
        """
        return []
