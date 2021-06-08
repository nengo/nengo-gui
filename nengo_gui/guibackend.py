"""Nengo GUI backend implementation."""

from __future__ import print_function

import json
import logging
import mimetypes
import os
import os.path
import pkgutil

try:
    from urllib.parse import unquote
except ImportError:  # Python 2.7
    from urllib import unquote
try:
    import ssl
except ImportError:  # for Python without ssl support
    from . import nossl as ssl

import time

import nengo_gui
import nengo_gui.exec_env
import nengo_gui.page
from nengo_gui import server, url
from nengo_gui._vendor.cookies import Cookie
from nengo_gui.completion import get_completions
from nengo_gui.password import checkpw, gensalt

logger = logging.getLogger(__name__)


class Session(object):
    __slots__ = ["creation_time", "authenticated", "peer_name", "login_host"]

    def __init__(self):
        self.creation_time = time.time()
        self.authenticated = False
        self.peer_name = None
        self.login_host = None


class SessionManager(object):
    def __init__(self, time_to_live):
        self.time_to_live = time_to_live
        self._sessions = {}

    def __getitem__(self, session_id):
        session = self._sessions.get(session_id, None)
        if session is None or session.creation_time + self.time_to_live < time.time():
            del self._sessions[session_id]
            raise KeyError("Session expired")
        return session

    def __len__(self):
        return len(self._sessions)

    def add_session(self, request, session):
        session_id = self._new_session_id(request)
        self._sessions[session_id] = session
        return session_id

    def _new_session_id(self, request):
        return gensalt(16)


class RequireAuthentication(object):
    def __init__(self, login_page):
        self.login_page = login_page

    @classmethod
    def get_token(cls, inst):
        if "token" in inst.db:
            return inst.db["token"]
        elif inst.headers.get("Authorization", "").lower().startswith("token "):
            return inst.headers.get("Authorization").split(" ")[1]
        return None

    def __call__(self, fn):
        def auth_checked(inst):
            session = inst.get_session()
            if session.authenticated:
                return fn(inst)
            elif inst.server.verify_token(self.get_token(inst)):
                self.authenticate(inst)
                return fn(inst)
            return server.HttpRedirect(inst.server.settings.prefix + self.login_page)

        return auth_checked

    @classmethod
    def authenticate(cls, request_handler):
        session = request_handler.get_session()
        session.authenticated = True
        session.login_host = request_handler.headers.get("host", None)
        try:
            session.peer_name = request_handler.request.getpeername()[0]
        except Exception:
            logger.warning(
                "Cannot get peer name. Session will not be tied to " "client.",
                exc_info=True,
            )
        request_handler.persist_session(session)


class GuiRequestHandler(server.HttpWsRequestHandler):
    http_commands = {
        "/": "serve_main",
        "/login": "login_page",
        "/static": "serve_static",
        "/browse": "browse",
        "/complete": "complete",
        "/shutdown": "request_shutdown",
        "/favicon.ico": "serve_favicon",
    }

    def get_expected_origins(self):
        login_host = self.get_session().login_host
        return [login_host] if login_host is not None else []

    def http_GET(self):
        if self.server.settings.prefix is None:
            if self.server.verify_token(RequireAuthentication.get_token(self)):
                prefix = self.resource
                if prefix.endswith("/"):
                    prefix = prefix[:-1]
                self.server.settings.prefix = prefix
                RequireAuthentication.authenticate(self)
            else:
                raise server.InternalServerError("Prefix not set.")

        if not self.resource.startswith(self.server.settings.prefix):
            raise server.InvalidResource(self.resource)
        self.resource = self.resource[len(self.server.settings.prefix) :]
        server.HttpWsRequestHandler.http_GET(self)

    def login_page(self):
        session = self.get_session()
        content = b""

        if session.authenticated:
            return server.HttpRedirect(self.server.settings.prefix + "/")

        if "pw" in self.db:
            valid_pw = self.server.settings.password_hash is not None and checkpw(
                self.db["pw"], self.server.settings.password_hash
            )
            valid_token = self.server.verify_token(self.db["pw"])
            if valid_pw or valid_token:
                RequireAuthentication.authenticate(self)
                return server.HttpRedirect(self.server.settings.prefix + "/")
            else:
                content += b"<p><strong>Invalid password. Try again."
                content += b"</strong></p>"
        else:
            content += b"<p>Please enter the password or the security token "
            content += b"shown by Nengo when it was started:</p>"

        return server.HtmlResponse(
            content
            + b"""
            <form method="POST"><p>
                <label for="pw">Password: </label>
                <input type="password" name="pw" />
                <input type="submit" value="Log in" />
            </p></form>
        """
        )

    def serve_static(self):
        """Handles http://host:port/static/* by returning pkg data"""
        assert self.resource[0] == "/"
        static_dir = "static" + os.sep
        fn = os.path.normpath(self.resource[1:])
        if os.path.commonprefix((static_dir, fn)) != static_dir:
            raise server.Forbidden()
        mimetype, encoding = mimetypes.guess_type(fn)
        data = pkgutil.get_data("nengo_gui", fn)
        return server.HttpResponse(data, mimetype)

    @RequireAuthentication("/login")
    def browse(self):
        r = [b'<ul class="jqueryFileTree" style="display: none;">']
        d = unquote(self.db["dir"])
        ex_tag = "//examples//"
        ex_html = b"<em>built-in examples</em>"
        if d == ".":
            r.append(
                b'<li class="directory collapsed examples_dir">'
                b'<a href="#" rel="'
                + ex_tag.encode("utf-8")
                + b'">'
                + ex_html
                + b"</a></li>"
            )
            path = "."
        elif d.startswith(ex_tag):
            path = os.path.join(nengo_gui.__path__[0], "examples", d[len(ex_tag) :])
        else:
            path = os.path.join(".", d)

        for f in sorted(os.listdir(path)):
            ff = os.path.join(path, f).encode("utf-8")
            if os.path.isdir(os.path.join(path, f)):
                f = f.encode("utf-8")
                r.append(
                    b'<li class="directory collapsed">'
                    b'<a href="#" rel="' + ff + b'/">' + f + b"</a></li>"
                )
            else:
                e = os.path.splitext(f)[1][1:]  # get .ext and remove dot
                if e == "py":
                    e = e.encode("utf-8")
                    f = f.encode("utf-8")
                    r.append(
                        b'<li class="file ext_' + e + b'">'
                        b'<a href="#" rel="' + ff + b'">' + f + b"</a></li>"
                    )
        r.append(b"</ul>")
        return server.HtmlResponse(b"".join(r))

    @RequireAuthentication("/login")
    def complete(self):
        completions = get_completions(
            self.db["code"],
            int(self.db["row"]) + 1,
            int(self.db["col"]),
            self.db["filename"],
        )
        return server.JsonResponse(
            [
                {
                    "name": c.name,
                    "value": c.name,
                    "score": 1,
                    "meta": c.type,
                }
                for c in completions
            ]
        )

    @RequireAuthentication("/login")
    def serve_main(self):
        if self.resource != "/":
            raise server.InvalidResource(self.resource)

        filename = self.query.get("filename", [None])[0]
        reset_cfg = self.query.get("reset", [False])[0]
        page = self.server.create_page(filename, reset_cfg=reset_cfg)

        # read the template for the main page
        html = pkgutil.get_data("nengo_gui", "templates/page.html")
        if isinstance(html, bytes):
            html = html.decode("utf-8")

        # fill in the javascript needed and return the complete page
        components = page.create_javascript()
        data = (html % dict(components=components)).encode("utf-8")
        return server.HttpResponse(data)

    @RequireAuthentication("/login")
    def request_shutdown(self):
        self.server.shutdown()

    def serve_favicon(self):
        self.resource = "/static/favicon.ico"
        return self.serve_static()

    @RequireAuthentication("/login")
    def ws_default(self):
        """Handles ws://host:port/viz_component with a websocket"""
        # figure out what component is being connected to

        gui = self.server
        uid = int(self.query["uid"][0])

        component = gui.component_uids[uid]
        while self.ws.state is server.WebSocket.ST_OPEN:
            try:
                if component.replace_with is not None:
                    component.finish()
                    component = component.replace_with

                # read all data coming from the component
                msg = self.ws.read_frame()
                while msg is not None:
                    if not self._handle_ws_msg(component, msg):
                        return
                    msg = self.ws.read_frame()

                # send data to the component
                component.update_client(self.ws)
                component.page.save_config(lazy=True)
                time.sleep(0.01)
            except server.SocketClosedError:
                # This error means the server has shut down
                component.page.save_config(lazy=False)  # Stop nicely
                break
            except:
                logger.exception("Error during websocket communication.")

        # After hot loop
        component.finish()

    def _handle_ws_msg(self, component, msg):
        """Handle websocket message. Returns True when further messages should
        be handled and false when no further messages should be processed."""
        if msg.data.startswith("config:"):
            return self._handle_config_msg(component, msg)
        elif msg.data.startswith("remove"):
            return self._handle_remove_msg(component, msg)
        else:
            try:
                component.message(msg.data)
                return True
            except:
                logging.exception("Error processing: %s", repr(msg.data))

    def _handle_config_msg(self, component, msg):
        cfg = json.loads(msg.data[7:])
        old_cfg = {}
        for k in component.config_defaults.keys():
            v = getattr(component.page.config[component], k)
            old_cfg[k] = v
        if not cfg == old_cfg:
            # Register config change to the undo stack
            component.page.config_change(component, cfg, old_cfg)
        for k, v in cfg.items():
            setattr(component.page.config[component], k, v)
        component.page.modified_config()
        return True

    def _handle_remove_msg(self, component, msg):
        if msg.data != "remove_undo":
            # Register graph removal to the undo stack
            component.page.remove_graph(component)
        component.page.remove_component(component)
        component.page.modified_config()
        return False

    def get_session(self):
        try:
            peer_name = self.request.getpeername()[0]
        except Exception:
            peer_name = None

        try:
            session_id = self.request_cookies[
                "_sid_" + str(self.server.server_port)
            ].value
            session = self.server.sessions[session_id]
            if session.peer_name != peer_name:
                logger.warning(
                    "Session peer name mismatch: %s, %s", peer_name, session.peer_name
                )
                raise KeyError()
        except KeyError:
            session = Session()
        return session

    def persist_session(self, session):
        sid = self.server.sessions.add_session(self.request, session)
        sid_name = "_sid_" + str(self.server.server_port)
        self.response_cookies.add(
            Cookie(
                name=sid_name,
                value=sid,
                path=self.server.settings.prefix + "/",
                httponly=True,
                version=1,
                max_age=self.server.settings.session_duration,
            )
        )

    def log_message(self, format, *args):
        logger.info(format, *args)


class ModelContext(object):
    """Provides context information to a model. This can include the locals
    dictionary, the filename and whether this model can (or is allowed) to be
    written to disk."""

    __slots__ = ["model", "filename", "locals", "writeable"]

    def __init__(self, model=None, locals=None, filename=None, writeable=True):
        self.filename = filename
        if self.filename is not None:
            try:
                self.filename = os.path.relpath(filename)
            except ValueError:
                # happens on Windows if filename is on a different
                # drive than the current directory
                self.filename = filename
            self.writeable = writeable
        else:
            self.writeable = False

        if model is None and locals is not None:
            model = locals.get("model", None)

        self.model = model
        self.locals = locals


class GuiServerSettings(object):
    __slots__ = [
        "listen_addr",
        "auto_shutdown",
        "password_hash",
        "ssl_cert",
        "ssl_key",
        "session_duration",
        "prefix",
    ]

    def __init__(
        self,
        listen_addr=("localhost", 8080),
        auto_shutdown=2,
        password_hash=None,
        ssl_cert=None,
        ssl_key=None,
        session_duration=60 * 60 * 24 * 30,
        prefix="",
    ):
        self.listen_addr = listen_addr
        self.auto_shutdown = auto_shutdown
        self.password_hash = password_hash
        self.ssl_cert = ssl_cert
        self.ssl_key = ssl_key
        self.session_duration = session_duration
        self.prefix = prefix

    @property
    def use_ssl(self):
        if self.ssl_cert is None and self.ssl_key is None:
            return False
        elif self.ssl_cert is not None and self.ssl_key is not None:
            return True
        else:
            raise ValueError("SSL needs certificate file and key file.")


class GuiServer(server.ManagedThreadHttpServer):
    def __init__(
        self,
        model_context,
        server_settings=GuiServerSettings(),
        page_settings=nengo_gui.page.PageSettings(),
    ):
        if nengo_gui.exec_env.is_executing():
            raise nengo_gui.exec_env.StartedGUIException()
        self.settings = server_settings

        server.ManagedThreadHttpServer.__init__(
            self, self.settings.listen_addr, GuiRequestHandler
        )
        if self.settings.use_ssl:
            for b in self.bindings:
                b.socket = ssl.wrap_socket(
                    b.socket,
                    certfile=self.settings.ssl_cert,
                    keyfile=self.settings.ssl_key,
                    server_side=True,
                )

        self.auth_token = gensalt(24)
        self._one_time_auth_tokens = set()
        self.sessions = SessionManager(self.settings.session_duration)

        # the list of running Pages
        self.pages = []

        # a mapping from uids to Components for all running Pages.
        # this is used to connect the websockets to the appropriate Component
        self.component_uids = {}

        self.model_context = model_context
        self.page_settings = page_settings

        self._last_access = time.time()

    def create_page(self, filename, reset_cfg=False):
        """Create a new Page with this configuration"""
        page = nengo_gui.page.Page(
            self, filename=filename, settings=self.page_settings, reset_cfg=reset_cfg
        )
        self.pages.append(page)
        return page

    def remove_page(self, page):
        self._last_access = time.time()
        page.close()
        self.pages.remove(page)
        if (
            not self._shutting_down
            and self.settings.auto_shutdown > 0
            and len(self.pages) <= 0
        ):
            time.sleep(self.settings.auto_shutdown)
            earliest_shutdown = self._last_access + self.settings.auto_shutdown
            if earliest_shutdown < time.time() and len(self.pages) <= 0:
                logging.info("No connections remaining to the nengo_gui server.")
                self.shutdown()

    def verify_token(self, token):
        if token in self._one_time_auth_tokens:
            self._one_time_auth_tokens.remove(token)
            return True
        elif token == self.auth_token:
            return True
        else:
            return False

    def gen_one_time_token(self):
        token = gensalt(24)
        self._one_time_auth_tokens.add(token)
        return token

    def get_resource(self, action=None, token=True):
        path = []
        if self.settings.prefix is not None:
            path.append(self.settings.prefix)
            if action is None:
                path.append("")
        if action is not None:
            path.append(action)

        if token == "one-time":
            query = {"token": self.gen_one_time_token()}
        elif token:
            query = {"token": self.auth_token}
        else:
            query = None
        return url.Resource("/".join(path), query)

    def get_url(self, action=None, token=True):
        protocol = "https" if self.settings.use_ssl else "http"
        return url.URL(
            self.server_name,
            self.server_port,
            protocol,
            self.get_resource(action, token),
        )
