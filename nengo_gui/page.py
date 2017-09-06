import logging
import os
import threading

from nengo_gui.editor import AceEditor
from nengo_gui.netgraph import NetGraph
from nengo_gui.simcontrol import SimControl

logger = logging.getLogger(__name__)


class Page(object):
    """A handler for a single page of the nengo_gui.

    Parameters
    ----------
    editor_class : class, optional (Default: `.AceEditor`)
    """

    def __init__(self, client, context, editor_class=AceEditor):
        self.lock = threading.Lock()

        self.client = client
        self.editor = editor_class(self.client)
        self.netgraph = NetGraph(self.client, context)
        self.simcontrol = SimControl(self.client, backend=context.backend)

        self.client.bind("page.save", self.save)

    def build(self):
        """Build the network."""
        # use the lock to make sure only one Simulator is building at a time
        # TODO: should there be a master lock in the GUI?
        with self.lock:
            self.netgraph.add_nengo_objects()
            self.simcontrol.build(self.netgraph.net)
            self.netgraph.remove_nengo_objects()

    def load(self, filename, context):
        self.simcontrol.backend = context.backend
        self.netgraph.load(filename, context)

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

        # TODO: why this? Can we just not?
        self.netgraph.reload(self.editor.code)

    def shutdown(self):
        # TODO: call shutdown methods on these instead?
        self.simcontrol.simthread.stop()
        self.netgraph.filethread.stop()
