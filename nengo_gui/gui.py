"""Classes to instantiate and manage the life cycle of the nengo_gui
backend."""

from __future__ import print_function

import select
import signal
import sys
import threading
import webbrowser

import nengo_gui
from nengo_gui.guibackend import GuiServer


class ServerShutdown(Exception):
    """Causes the server to shutdown when raised."""
    pass


class BaseGUI(object):
    """Creates a basic nengo_gui backend server.

    Parameters
    ----------
    model_context : nengo_gui.backend.backend.ModelContext
        Model and its context served by the backend.
    server_settings : nengo_gui.backend.backend.GuiServerSettings, optional
        Backend settings.
    page_settings : nengo_gui.page.PageSettings, optional
        Frontend page settings.
    """
    def __init__(
            self, model_context, server_settings=None, page_settings=None):
        if server_settings is None:
            server_settings = nengo_gui.guibackend.GuiServerSettings()
        if page_settings is None:
            page_settings = nengo_gui.page.PageSettings()

        self.model_context = model_context

        self.server = GuiServer(
            self.model_context, server_settings, page_settings)

    def start(self):
        """Start the backend server and wait until it shuts down."""
        try:
            self.server.serve_forever(poll_interval=0.02)
        except ServerShutdown:
            self.server.shutdown()
        finally:
            self.server.wait_for_shutdown(0.05)


class InteractiveGUI(BaseGUI):
    """Creates a nengo_gui backend server and provides some useful information
    on stdout. Also registers handlers to allow a server shutdown with Ctrl-C.

    Parameters
    ----------
    model_context : nengo_gui.backend.backend.ModelContext
        Model and its context served by the backend.
    page_settings : nengo_gui.page.PageSettings, optional
        Frontend page settings.
    port : int
        Port to listen on.
    password : str, optional
        Password required to connect to the backend.
    """

    def start(self):
        protocol = 'https:' if self.server.settings.use_ssl else 'http:'
        print("Starting nengo server at %s//%s:%d" %
              (protocol, 'localhost', self.server.server_port))

        if not sys.platform.startswith('win'):
            signal.signal(signal.SIGINT, self._confirm_shutdown)

        try:
            self.server.serve_forever(poll_interval=0.02)
            print("No connections remaining to the nengo_gui server.")
        except ServerShutdown:
            self.server.shutdown()
        finally:
            print("Shutting down server...")

            self.server.wait_for_shutdown(0.05)
            n_zombie = sum(thread.is_alive()
                           for thread, _ in self.server.requests)
            if n_zombie > 0:
                print("%d zombie threads will close abruptly" % n_zombie)

    def _confirm_shutdown(self, signum, frame):
        signal.signal(signal.SIGINT, self._immediate_shutdown)
        sys.stdout.write("\nShut-down this web server (y/[n])? ")
        sys.stdout.flush()
        rlist, _, _ = select.select([sys.stdin], [], [], 10)
        if rlist:
            line = sys.stdin.readline()
            if line[0].lower() == 'y':
                raise ServerShutdown()
            else:
                print("Resuming...")
        else:
            print("No confirmation received. Resuming...")
        signal.signal(signal.SIGINT, self._confirm_shutdown)

    def _immediate_shutdown(self, signum, frame):
        raise ServerShutdown()


class GUI(InteractiveGUI):
    """Starts an InteractiveGUI.

    Provides an easier instantiation syntax for the use in scripts.

    Parameters
    ----------
    filename : str
        Filename of the calling script (usually you want to use ``__file__``).
    model : nengo.Network
        The model to visualize.  If None, the script filename is evaluated to
        create the model.
    locals : dict
        The locals() dictionary after running the script.  If None, it is
        determinined by running the script filename.  Its contents are used
        to give useful names for the objects in the model.
    editor : bool
        Whether or not to show the editor
    """
    def __init__(self, filename=None, model=None, locals=None, editor=True):
        if not editor:
            ps = nengo_gui.page.PageSettings(
                    editor_class=nengo_gui.components.editor.NoEditor)
        else:
            ps = nengo_gui.page.PageSettings()
        super(GUI, self).__init__(nengo_gui.guibackend.ModelContext(
            filename=filename, model=model, locals=locals),
            page_settings=ps)

    def start(self):
        t = threading.Thread(
            target=webbrowser.open,
            args=('http://localhost:%d' % self.server.server_port,))
        t.start()

        super(GUI, self).start()
