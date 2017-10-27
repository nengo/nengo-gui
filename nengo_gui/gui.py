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
from nengo_gui.page import Page
from nengo_gui.server import (
    HtmlResponse, HttpRedirect, ServerShutdown, WebSocketFrame)


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
        self.filename_cfg = filename_cfg
        self.filename = filename
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


class ServerSettings(object):
    __slots__ = ('listen_addr',
                 'auto_shutdown',
                 'password_hash',
                 'ssl_cert',
                 'ssl_key',
                 'session_duration')

    def __init__(self,
                 listen_addr=('localhost', 8080),
                 auto_shutdown=2,
                 password_hash=None,
                 ssl_cert=None,
                 ssl_key=None,
                 session_duration=60 * 60 * 24 * 30):
        self.listen_addr = listen_addr
        self.auto_shutdown = auto_shutdown
        self.password_hash = password_hash
        self.ssl_cert = ssl_cert
        self.ssl_key = ssl_key
        self.session_duration = session_duration

    @property
    def use_ssl(self):
        if self.ssl_cert is None and self.ssl_key is None:
            return False
        elif self.ssl_cert is not None and self.ssl_key is not None:
            return True
        else:
            raise ValueError("SSL needs certificate file and key file.")


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
        return server.HttpResponse(r"""
<html>
  <head>
    <link rel="icon" href="static/dist/favicon.ico" type="image/x-icon">
  </head>
  <body id="body">
    <script src="static/dist/nengo.js" type="text/javascript" charset="utf-8"></script>
  </body>
</html>
      """.strip().encode("utf-8"))

    @server.AuthenticatedHttpWsRequestHandler.http_route('/favicon.ico')
    def serve_favicon(self):
        self.route = '/static/favicon.ico'
        return self.serve_static()

    @server.AuthenticatedHttpWsRequestHandler.http_route('/bootstrap.min.css.map')
    def serve_bootstrap_map(self):
        # TODO: should we actually do this ...?
        try:
            root = os.path.realpath(os.path.join(paths.rootdir, ".."))
            fn = os.path.join(
                root, 'node_modules/bootstrap/dist/css/bootstrap.min.css.map')
            mimetype, encoding = mimetypes.guess_type(fn)
            with open(fn, 'rb') as fp:
                data = fp.read()
            return server.HttpResponse(data, mimetype)
        except Exception:
            raise server.InvalidResource(self.route)

    @server.AuthenticatedHttpWsRequestHandler.ws_route('/')
    @server.RequireAuthentication('/login')
    def ws_default(self):
        """Handles ws://host:port/component with a websocket"""
        # figure out what component is being connected to

        filename = self.query.get('filename', [None])[0]
        reset_cfg = self.query.get('reset', [False])[0]

        # One of these per page
        client = ClientConnection(self.ws)
        page = self.server.create_page(client, filename, reset_cfg=reset_cfg)

        now = default_timer()
        next_ping_time = now

        while True:
            try:
                # Read all data
                msg = self.ws.read_frame()
                while msg is not None:
                    route, kwargs = json.loads(msg.data)
                    page.client.dispatch(route, **kwargs)
                    msg = self.ws.read_frame()

                # TODO: really...?
                # page.config.save(lazy=True)

                # Keep connection alive
                now = default_timer()
                if next_ping_time is None or now > next_ping_time:
                    self.ws.write_frame(WebSocketFrame(
                        1, 0, WebSocketFrame.OP_PING, 0, b''))
                next_ping_time = now + 2.0
                time.sleep(0.01)
            except server.SocketClosedError:
                # This error means the server has shut down
                page.save(force=True)  # Stop nicely
                break
            except Exception as e:
                logger.exception("Error during websocket communication: %s", e)

        self.server.remove_page(page)

    @server.AuthenticatedHttpWsRequestHandler.ws_route('/fast')
    @server.RequireAuthentication('/login')
    def fast_ws(self):
        """Handles ws://host:port/fast with a websocket"""
        # figure out what component is being connected to

        client = FastClientConnection(self.ws)
        page = self.server.pages[int(self.query['page'][0])]
        uid = self.query['uid']
        print(uid)
        component = page.components.by_uid[uid]
        # TODO: isinstance better?
        assert hasattr(component, "attach"), (
            "Do not make a WS connection for a non-Widget component")
        component.attach(client)

        # now = default_timer()
        # next_ping_time = now

        while True:
            try:
                msg = self.ws.read_frame()
                while msg is not None:
                    client.receive(msg.data)

                # TODO: do we need to keep alive?
                # Keep connection alive
                # now = default_timer()
                # if next_ping_time is None or now > next_ping_time:
                #     self.ws.write_frame(WebSocketFrame(
                #         1, 0, WebSocketFrame.OP_PING, 0, b''))
                # next_ping_time = now + 5.0
                # time.sleep(0.001)
            except server.SocketClosedError:
                # This error means the server has shut down
                logger.debug("Shutting down fast connection for %r", uid)
                break
            except Exception as e:
                logger.exception("Error in fast connection for %r: %s", uid, e)

    def log_message(self, format, *args):
        logger.info(format, *args)


class GuiServer(server.ManagedThreadHttpWsServer):
    def __init__(self, context,
                 server_settings=ServerSettings(),
                 editor=True):
        if exec_env.is_executing():
            raise exec_env.StartedGUIException()
        self.settings = server_settings

        server.ManagedThreadHttpWsServer.__init__(
            self, self.settings.listen_addr, GuiRequestHandler)
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

    def create_page(self, client, filename, reset_cfg=False):
        """Create a new Page with this configuration"""
        page = Page(client, self.context, self.editor_class)
        if reset_cfg:
            page.clear_config()
        self.pages.append(page)
        return page

    def remove_page(self, page):
        page.finished = True
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
        except ServerShutdown:
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
        print("Starting Nengo server at %s//%s:%d" %
              (protocol, 'localhost', self.server.server_port))

        if not sys.platform.startswith('win'):

            def immediate_shutdown(signum, frame):
                raise ServerShutdown()

            def confirm_shutdown(signum, frame):
                signal.signal(signal.SIGINT, immediate_shutdown)
                sys.stdout.write("\nShutdown this Nengo server (y/[n])? ")
                sys.stdout.flush()
                rlist, _, _ = select.select([sys.stdin], [], [], 10)
                if rlist:
                    line = sys.stdin.readline()
                    if line[0].lower() == 'y':
                        immediate_shutdown(signum, frame)
                    else:
                        print("Resuming...")
                else:
                    print("No confirmation received. Resuming...")
                signal.signal(signal.SIGINT, confirm_shutdown)

            signal.signal(signal.SIGINT, confirm_shutdown)

        try:
            self.server.serve_forever(poll_interval=0.02)
            print("No connections remaining to the Nengo server.")
        except ServerShutdown:
            self.server.shutdown()
        finally:
            print("Shutting down server...")

            self.server.wait_for_shutdown(0.05)
            n_zombie = sum(thread.is_alive()
                           for thread, _ in self.server.requests)
            if n_zombie > 0:
                print("%d zombie threads will close abruptly" % n_zombie)


class GUI(object):
    """Starts an InteractiveGUI.

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
        self.gui = InteractiveGUI(context, editor=editor)

    def start(self):
        # TODO: https?
        t = threading.Thread(
            target=webbrowser.open,
            args=('http://localhost:%d' % self.server.server_port,))
        # TODO: daemon? does this get closed?
        # t.daemon = True
        t.start()
        self.gui.start()
