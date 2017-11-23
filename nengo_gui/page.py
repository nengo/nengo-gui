import logging
import os
import threading

from nengo_gui.client import bind, ExposedToClient
from nengo_gui.components import Voltage  # TODO: remove hack!
from nengo_gui.editor import AceEditor
from nengo_gui.netgraph import NetGraph
from nengo_gui.simcontrol import SimControl

logger = logging.getLogger(__name__)


class Page(ExposedToClient):
    """A handler for a single page of the nengo_gui.

    Parameters
    ----------
    editor_class : class, optional (Default: `.AceEditor`)
    """

    def __init__(self, client, context, editor_class=AceEditor):
        super(Page, self).__init__(client)

        self.client = client
        self.editor = editor_class(self.client)
        self.simcontrol = SimControl(self.client, backend=context.backend)
        self.simcontrol.backend = context.backend
        self.netgraph = NetGraph(
            self.client, context.filename, context.filename_cfg)

        self.client.bind("page.save", self.save)

        self.lock = threading.Lock()

    @bind("page.build")
    def build(self):
        """Build the network."""
        # use the lock to make sure only one Simulator is building at a time
        # TODO: should there be a master lock in the GUI?
        with self.lock:
            self.netgraph.add_nengo_objects()
            self.simcontrol.add_nengo_objects(self.netgraph.model)
            # TODO: Remove hack!
            del self.simcontrol.voltage_comps[:]
            for c in self.netgraph.components:
                if isinstance(c, Voltage):
                    self.simcontrol.voltage_comps.append(c)
            self.simcontrol.build(self.netgraph.model, self.netgraph.filename)
            self.netgraph.remove_nengo_objects()
            self.simcontrol.remove_nengo_objects(self.netgraph.model)

    @bind("page.ready")
    def ready(self):
        pass

    @bind("page.save")
    def save(self, filename=None, force=False):
        filename = self.netgraph.filename if filename is None else filename
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
            if self.editor.code is not None:
                with open(filename, 'w') as f:
                    f.write(self.editor.code)

            if rename:
                self.editor.send_filename(filename)

        except IOError:
            self.editor.send_filename(
                filename, "Could not save %s: permission denied" %
                (filename,))

        # TODO: why this? Can we just not?
        # self.netgraph.reload(self.editor.code)

    def shutdown(self):
        # TODO: call shutdown methods on these instead?
        self.simcontrol.simthread.stop()
        self.netgraph.filethread.stop()
