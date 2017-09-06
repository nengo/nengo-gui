"""Classes to instantiate and manage the life cycle of nengo_gui."""

from __future__ import print_function

import json
import mimetypes
import os
import logging
import pkgutil
import select
import signal
import ssl
import sys
import threading
import time
import webbrowser
from timeit import default_timer

from nengo_gui import exec_env, paths, server
from nengo_gui.client import ClientConnection, FastClientConnection
from nengo_gui.compat import unquote
from nengo_gui.editor import AceEditor, NoEditor
from nengo_gui.config import ServerSettings
from nengo_gui.page import Page
from nengo_gui.server import HtmlResponse, HttpRedirect, WebSocketFrame


logger = logging.getLogger(__name__)


class Context(object):
    """Provides context information to the page.

    This can include the locals dictionary, the filename and whether
    this model can (or is allowed) to be written to disk.
    """

    def __init__(self,
                 model=None,
                 locals=None,
                 filename=None,
                 filename_cfg=None,
                 writeable=True,
                 backend="nengo"):
        self.writeabel = writeable
        self.filename = filename
        self.filename_cfg = filename_cfg
        self.backend = backend

        if model is None and locals is not None:
            model = locals.get('model', None)

        if model is None and filename is None:
            raise ValueError("No model.")

        self.model = model
        self.locals = locals

    @property
    def filename(self):
        return self._filename

    @filename.setter
    def filename(self, value):
        self._filename = value

        if value is None:
            self.writeable = False
        else:
            try:
                self._filename = os.path.relpath(value)
            except ValueError:
                # happens on Windows if filename is on a different
                # drive than the current directory
                pass

        if self.filename_cfg is None:
            self.filename_cfg = "%s.cfg" % (self._filename,)


class GuiRequestHandler(server.AuthenticatedHttpWsRequestHandler):

    @server.AuthenticatedHttpWsRequestHandler.http_route('/browse')
    @server.RequireAuthentication('/login')
    def browse(self):
        r = [b'<ul class="jqueryFileTree" style="display: none;">']
        d = unquote(self.db['dir'])
        root = self.db['root'] if 'root' in self.db else '.'
        ex_tag = '//examples//'
        ex_html = b'built-in examples'
        if d == root:
            r.append(b'<li class="directory collapsed examples_dir">'
                     b'<a href="#" rel="' + ex_tag.encode('utf-8') + b'">' +
                     ex_html + b'</a></li>')
            path = root
        elif d.startswith(ex_tag):
            path = os.path.join(paths.examples, d[len(ex_tag):])
        else:
            path = os.path.join(root, d)

        for f in sorted(os.listdir(path)):
            ff = os.path.join(path, f).encode('utf-8')
            if os.path.isdir(os.path.join(path, f)):
                f = f.encode('utf-8')
                r.append(b'<li class="directory collapsed">'
                         b'<a href="#" rel="' + ff + b'/">' + f + b'</a></li>')
            else:
                e = os.path.splitext(f)[1][1:]  # get .ext and remove dot
                if e == 'py':
                    e = e.encode('utf-8')
                    f = f.encode('utf-8')
                    r.append(b'<li class="file ext_' + e + b'">'
                             b'<a href="#" rel="' + ff + b'">' +
                             f + b'</a></li>')
        r.append(b'</ul>')
        return server.HtmlResponse(b''.join(r))

    @server.AuthenticatedHttpWsRequestHandler.http_route('/login')
    def login(self):
        session = self.checkpw()
        content = []

        if session.authenticated:
            return HttpRedirect('/')

        if 'pw' in self.db and not session.authenticated:
            content.append(
                b'<p><strong>Invalid password. Try again.</strong></p>')
        else:
            content.append(b'<p>Please enter the password:</p>')

        return HtmlResponse(b'\n'.join(content + [
            b'<form method="POST"><p>',
            b'  <label for="pw">Password: </label>',
            b'  <input type="password" name="pw" />',
            b'  <input type="submit" value="Log in" />',
            b'</p></form>',
        ]))

    @server.AuthenticatedHttpWsRequestHandler.http_route('/static')
    @server.RequireAuthentication('/login')
    def serve_static(self):
        """Handles http://host:port/static/* by returning pkg data"""
        fn = os.path.join('static', self.route)
        mimetype, encoding = mimetypes.guess_type(fn)
        data = pkgutil.get_data('nengo_gui', fn)
        return server.HttpResponse(data, mimetype)

    @server.AuthenticatedHttpWsRequestHandler.http_route('/')
    @server.RequireAuthentication('/login')
    def serve_main(self):
        if self.route != '/':
            raise server.InvalidResource(self.route)

        # TODO: This should do very little,
        #       just sending across an HTML that will connect to websocket
        #       and start the process

        filename = self.query.get('filename', [None])[0]
        reset_cfg = self.query.get('reset', [False])[0]

        # read the template for the main page
        html = pkgutil.get_data('nengo_gui', 'templates/page.html')
        if isinstance(html, bytes):
            html = html.decode("utf-8")

        # data = html % dict(
        #     main_components=main_components, components=components)
        # data = data.encode('utf-8')

        # return server.HttpResponse(data)
        return server.HttpResponse(html.encode("utf-8"))

    @server.AuthenticatedHttpWsRequestHandler.http_route('/favicon.ico')
    def serve_favicon(self):
        self.route = '/static/favicon.ico'
        return self.serve_static()

    @server.AuthenticatedHttpWsRequestHandler.ws_route('/')
    @server.RequireAuthentication('/login')
    def ws_default(self):
        """Handles ws://host:port/component with a websocket"""
        # figure out what component is being connected to

        if "uid" not in self.query:
            # One of these per page
            client = ClientConnection(self.ws)
            page = self.server.create_page(client, filename, reset_cfg=reset_cfg)
            component = None
            # fill in the javascript needed and return the complete page
            # TODO: create_javascript should be replaced to be more like
            #       and init that calls TS methods
            # main_components, components = page.create_javascript()

        else:
            client = FastClientConnection(self.ws)
            page = self.pages[int(self.query['page'][0])]
            uid = self.query['uid']
            print(uid)
            component = page.components.by_uid[uid]
            # TODO: isinstance better?
            assert hasattr(component, "attach"), (
                "Do not make a WS connection for a non-Widget component")
            component.attach(client)

        now = default_timer()
        next_ping_time = now

        while True:
            try:
                # Main connection
                if component is None:
                    # Read all data coming from the component
                    msg = self.ws.read_frame()
                    while msg is not None:
                        route, kwargs = json.loads(msg)
                        page.client.dispatch(route, **kwargs)
                        msg = self.ws.read_frame()

                    # TODO: make sure not required
                    # if component.replace_with is not None:
                    #     component = component.replace_with
                    # component.update_client(self.ws)

                    # TODO: really...?
                    page.config.save(lazy=True)

                # Fast connections have no additional steps (one way)

                # Keep connection alive
                now = default_timer()
                if next_ping_time is None or now > next_ping_time:
                    self.ws.write_frame(WebSocketFrame(
                        1, 0, WebSocketFrame.OP_PING, 0, b''))
                next_ping_time = now + 2.0
                time.sleep(0.01)
            except server.SocketClosedError:
                # This error means the server has shut down
                if component is None:
                    page.save_config(lazy=False)  # Stop nicely
                    break
            except Exception as e:
                logger.exception("Error during websocket communication: %s", e)

        # After hot loop
        if component is None:
            page.finished = True
            # Do page cleanup?
            self.server.remove_page(page)

    def log_message(self, format, *args):
        logger.info(format, *args)


class GuiServer(server.ManagedThreadHttpServer):
    def __init__(self, context,
                 server_settings=ServerSettings(),
                 editor=True):
        if exec_env.is_executing():
            raise exec_env.StartedGUIException()
        self.settings = server_settings

        super(server.ManagedThreadHttpServer, self).__init__(
            self.settings.listen_addr, GuiRequestHandler)
        if self.settings.use_ssl:
            self.socket = ssl.wrap_socket(
                self.socket, certfile=self.settings.ssl_cert,
                keyfile=self.settings.ssl_key, server_side=True)

        self.sessions.time_to_live = self.settings.session_duration

        # the list of running Pages
        self.pages = []

        # a mapping from uids to Components for all running Pages.
        # this is used to connect the websockets to the appropriate Component
        self.component_uids = {}
        self.component_ids = {}

        self.context = context
        self.editor_class = AceEditor if editor else NoEditor

        self._last_access = time.time()

    def create_page(self, filename, reset_cfg=False):
        """Create a new Page with this configuration"""
        page = Page(self.context, self.editor_class)
        page.load(filename)
        if reset_cfg:
            page.clear_config()
        self.pages.append(page)
        return page

    def remove_page(self, page):
        self._last_access = time.time()
        self.pages.remove(page)
        if (not self._shutting_down and self.settings.auto_shutdown > 0 and
                len(self.pages) <= 0):
            time.sleep(self.settings.auto_shutdown)
            earliest_shutdown = self._last_access + self.settings.auto_shutdown
            if earliest_shutdown < time.time() and len(self.pages) <= 0:
                logging.info(
                    "No connections remaining to the nengo_gui server.")
                self.shutdown()


class BaseGUI(object):
    """A basic nengo_gui backend server.

    This is used in embedded situations like the Jupyter notebook.

    Parameters
    ----------
    context : Context
        Model and its context served by the backend.
    server_settings : nengo_gui.backend.backend.GuiServerSettings, optional
        Backend settings.
    """
    def __init__(self, context, server_settings=None, editor=True):
        if server_settings is None:
            server_settings = ServerSettings()

        self.context = context

        self.server = GuiServer(self.context, server_settings, editor=editor)

    def start(self):
        """Start the backend server and wait until it shuts down."""
        try:
            self.server.serve_forever(poll_interval=0.02)
        except server.ServerShutdown:
            self.server.shutdown()
        finally:
            self.server.wait_for_shutdown(0.05)


class InteractiveGUI(BaseGUI):
    """A standalone nengo_gui backend server.

    In addition to `.BaseGUI`, this provides useful information on stdout
    and registers handlers to allow a server shutdown with Ctrl-C.

    Parameters
    ----------
    context : Context
        Model and its context served by the backend.
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
        except server.ServerShutdown:
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
                raise server.ServerShutdown()
            else:
                print("Resuming...")
        else:
            print("No confirmation received. Resuming...")
        signal.signal(signal.SIGINT, self._confirm_shutdown)

    def _immediate_shutdown(self, signum, frame):
        raise server.ServerShutdown()


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
        context = Context(filename=filename, model=model, locals=locals)
        super(GUI, self).__init__(context, editor=editor)

    def start(self):
        t = threading.Thread(
            target=webbrowser.open,
            args=('http://localhost:%d' % self.server.server_port,))
        t.start()

        super(GUI, self).start()
