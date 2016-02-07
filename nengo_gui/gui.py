"""Classes to instantiate and manage the life cycle of the nengo_gui
backend."""

from __future__ import print_function

import select
import signal
import sys

from nengo_gui.backend.backend import GuiServer


class ServerShutdown(Exception):
    """Causes the server to shutdown when raised."""
    pass


class GUI(object):
    """Creates a basic nengo_gui backend server.

    Parameters
    ----------
    model_context : nengo_gui.backend.backend.ModelContext
        Model and its context served by the backend.
    port : int
        Port to listen on.
    password : str, optional
        Password required to connect to the backend.
    """
    def __init__(self, model_context, port=8080, password=None):
        self.model_context = model_context
        if password is not None:
            raise NotImplementedError()
            #nengo_gui.server.Server.add_user('', password)
            #addr = ''
        else:
            addr = 'localhost'

        self.server = GuiServer((addr, port), self.model_context)

    def start(self):
        """Start the backend server and wait until it shuts down."""
        try:
            self.server.serve_forever(poll_interval=0.02)
        except ServerShutdown:
            self.server.shutdown()
        finally:
            self.server.wait_for_shutdown(0.05)


class InteractiveGUI(GUI):
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
        print("Starting nengo server at http://localhost:%d" %
              self.server.server_address[1])

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
