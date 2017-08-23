from collections import defaultdict
import importlib
import json
import logging
import os
import threading
import warnings

from nengo_gui.editor import AceEditor
from nengo_gui.netgraph import NetGraph
from nengo_gui.simcontrol import SimControl

logger = logging.getLogger(__name__)


class ClientConnection(object):

    def __init__(self, ws):
        self.ws = ws
        self.callbacks = defaultdict(list)

    def bind(self, name):
        """Define a function name that the client can call."""
        def _bind(endpoint):
            self.callbacks[name].append(endpoint)
            return endpoint
        return _bind

    def is_bound(self, name):
        return name in self.callbacks

    def dispatch(self, name, **kwargs):
        """Call a function bound to this page."""
        if not self.is_bound(name):
            warnings.warn("Nothing bound for %r" % (name,))
        for cb in self.callbacks[name]:
            cb(**kwargs)

    def send(self, name, **kwargs):
        """Send a message to the client."""
        assert self.ws is not None
        self.ws.write_text(json.dumps([name, kwargs]))


class Page(object):
    """A handler for a single page of the nengo_gui.

    Parameters
    ----------
    editor_class : class, optional (Default: `.AceEditor`)
    """

    def __init__(self, editor_class=AceEditor):

        self.lock = threading.Lock()

        self.editor = editor_class()
        self.netgraph = NetGraph()
        self.simcontrol = SimControl()
        # self.client = None

    def attach(self, websocket):
        client = ClientConnection(websocket)

        self.editor.attach(client)
        self.netgraph.attach(client)
        self.simcontrol.attach(client)

        client.bind("page.save", self.save)

        # self.client = client

    def build(self):
        """Build the network."""

        # use the lock to make sure only one Simulator is building at a time
        # TODO: should there be a master lock in the GUI?
        with self.lock:

            # Pause the runner thread
            self.runner.pause()

            # Remove the current simulator
            self.runner.sim = None

            # Modify the network for the various Components
            for c in self.components:
                c.add_nengo_objects(self.net.ojb, self.config)

            # Determine the backend to use
            backend = importlib.import_module(self.backend)

            self.runner.sim, stdout = self.net.build(backend.Simulator)
            self.stdout += stdout

            # remove the temporary components added for visualization
            for c in self.components:
                c.remove_nengo_objects(self.net.obj)

            # TODO: add checks to make sure everything's been removed

            # TODO: should we play this now or elsewhere?
            self.runner.play()

    def load(self, filename, context):
        self.backend = context.backend
        if context.filename == filename:
            # Load up from context
            self.net.filename = filename
            self.net.obj = context.network
            if context.locals is not None:
                self.net.locals = context.locals.copy()
        else:
            # Load from file
            self.stdout = self.net.load(filename)

        # Figure out good names for objects
        self.names.update(self.net.locals)

        # Load the .cfg file
        self.config = self.load_config()
        self.config_save_needed = False
        self.config_save_time = None   # time of last config file save

        # Get handles to components
        self.components.from_locals(self.net.locals)

    def save(self, filename):
        rename = filename != self.netgraph.filename

        if rename and os.path.exists(filename):
            self.editor.send_filename(filename, "Could not rename to %s: "
                                      "file already exists." % (filename,))
            return

        if rename:
            # TODO: update page => netgraph, new structure
            self.page.filename_cfg = filename + '.cfg'
            self.page.save_config(force=True)
            self.page.filename = filename

        try:
            with open(filename, 'w') as f:
                f.write(self.editor.code)

            if rename:
                self.editor.send_filename(filename)

        except IOError:
            self.editor.send_filename(
                filename, "Could not save %s: permission denied" %
                (filename,))

        # TODO: why this?
        self.netgraph.update_code(self.code)

    def shutdown(self):
        # TODO: call shutdown methods on these instead?
        self.simcontrol.simthread.stop()
        self.netgraph.filethread.stop()
