from __future__ import print_function

import atexit
import json
import socket
import threading
import time
import uuid
import warnings
import weakref

try:
    from http.client import BadStatusLine
    from urllib.request import urlopen
except ImportError:
    from httplib import BadStatusLine
    from urllib2 import urlopen

import nengo_gui
from IPython import get_ipython
from IPython.display import HTML, display
from notebook.base.handlers import IPythonHandler
from notebook.utils import url_path_join
from tornado import gen, httpclient, httputil
from tornado.simple_httpclient import SimpleAsyncHTTPClient
from tornado.websocket import WebSocketHandler, websocket_connect


class ConfigReuseWarning(UserWarning):
    pass


class InlineGUI(object):
    shutdown_hook_registered = False

    servers = weakref.WeakValueDictionary()
    configs = set()

    host = "localhost"

    def __init__(self, model, cfg=None, height=600, backend="nengo"):
        self.height = height

        self._started = False

        if cfg is None:
            cfg = get_ipython().mktempfile()

        self.server = self.start_server(cfg, model)
        self.port = self.server.server.server_port
        self.server.server.settings.prefix = None
        self.server.server.page_settings.backend = backend

        self.resource = url_path_join(
            "/nengo", str(self.port), str(self.server.server.get_resource())
        )

    @classmethod
    def start_server(cls, cfg, model):
        if not cls.shutdown_hook_registered:
            atexit.register(InlineGUI.shutdown_all, timeout=5)
            cls.shutdown_hook_registered = True

        # Make sure only one server is writing the same config.
        server = cls.servers.get(cfg, None)
        if server is not None and server.is_alive():
            warnings.warn(
                ConfigReuseWarning(
                    "Reusing config. Only the most recent visualization will "
                    "update the config."
                )
            )
            for page in server.server.pages:
                page.save_config(force=True)
                page.filename_cfg = get_ipython().mktempfile()
                cls.servers[page.filename_cfg] = server

        name = model.label
        server_settings = nengo_gui.guibackend.GuiServerSettings(("localhost", 0))
        model_context = nengo_gui.guibackend.ModelContext(
            model=model, locals=get_ipython().user_ns, filename=None, writeable=False
        )
        page_settings = nengo_gui.page.PageSettings(
            filename_cfg=cfg, editor_class=nengo_gui.components.editor.NoEditor
        )
        server = nengo_gui.gui.GuiThread(model_context, server_settings, page_settings)
        server.start()
        cls.servers[cfg] = server
        cls.configs.add(cfg)
        return server

    @classmethod
    def shutdown_all(cls, timeout=None):
        def get_timeout(start=time.clock()):
            if timeout is None:
                return None
            else:
                return max(0.001, timeout - (time.clock() - start))

        for cfg in cls.configs:
            server = cls.servers.get(cfg, None)
            server.shutdown(get_timeout())

    def _ipython_display_(self):
        display(
            HTML(
                r"""
            <script type="text/javascript" id="{uuid}">
            {{
                let req = new XMLHttpRequest();
                req.addEventListener("load", function() {{
                    if (this.status != 200 && this.response != 'OK') {{
                        let p = document.getElementById('{uuid}').parentNode;
                        p.innerHTML +=
                            'The nengo_gui.jupyter notebook server ' +
                            'extension was not loaded. Please activate it ' +
                            'with the following command:' +
                            '<pre>jupyter serverextension enable ' +
                            'nengo_gui.jupyter</pre>';
                        p.classList.add('output_stderr');
                    }}
                }});
                req.open('GET', './nengo/check', true);
                req.send();
            }}
            </script>
        """.format(
                    uuid=uuid.uuid4()
                )
            )
        )

        self.server.wait_for_startup()
        if self.server.is_alive():
            vdom = {
                "tagName": "div",
                "attributes": {"id": str(uuid.uuid4())},
                "children": [
                    {
                        "tagName": "iframe",
                        "attributes": {
                            "src": "." + str(self.resource),
                            "width": "100%",
                            "height": str(self.height),
                            "frameborder": "0",
                            "class": "cell",
                            "allowfullscreen": "allowfullscreen",
                            "style": {
                                "border": "1px solid #eee",
                                "boxSizing": "border-box",
                            },
                        },
                    }
                ],
            }
            html = """
                <div id="{id}">
                    <iframe
                        src=".{url}"
                        width="100%"
                        height="{height}"
                        frameborder="0"
                        class="cell"
                        style="border: 1px solid #eee; box-sizing: border-box;"
                        allowfullscreen></iframe>
                </div>
            """.format(
                url=self.resource, id=uuid.uuid4(), height=self.height
            )
            bundle = {
                "application/vdom.v1+json": vdom,
                "text/html": html,
            }
            display(bundle, raw=True)
        else:
            print("Server is not alive.")


class IPythonViz(InlineGUI):
    def __init__(self, *args, **kwargs):
        warnings.warn(DeprecationWarning("IPythonViz has been renamed to InlineGUI."))
        super(IPythonViz, self).__init__(*args, **kwargs)


class LabServerManager(object):
    shutdown_hook_registered = False
    server = None

    @classmethod
    def start_server(cls, base_url):
        if not cls.shutdown_hook_registered:
            atexit.register(LabServerManager.shutdown, timeout=5)
            cls.shutdown_hook_registered = True

        if cls.server is not None:
            return cls.server

        server_settings = nengo_gui.guibackend.GuiServerSettings(
            listen_addr=("localhost", 0), auto_shutdown=0
        )
        model_context = nengo_gui.guibackend.ModelContext()

        cls.server = nengo_gui.gui.GuiThread(model_context, server_settings)
        cls.server.start()
        cls.server.server.settings.prefix = url_path_join(
            base_url, "nengo/" + str(cls.server.server.server_port)
        )
        cls.server.wait_for_startup()
        return cls.server

    @classmethod
    def shutdown(cls, timeout=None):
        if cls.server is not None:
            cls.server.shutdown(timeout)
            cls.server = None


class NengoGuiHandler(IPythonHandler):
    def __init__(self, *args, **kwargs):
        super(NengoGuiHandler, self).__init__(*args, **kwargs)
        self.status_code_read = False
        self.header_keys = set()

    @gen.coroutine
    def get(self, port):
        client = httpclient.AsyncHTTPClient()
        headers = httputil.HTTPHeaders()
        for name, value in self.request.headers.get_all():
            if name.lower() == "host":
                headers.add(name, "localhost:" + port)
            elif name.lower() == "origin":
                headers.add(name, "http://localhost:" + port)
            else:
                headers.add(name, value)
        request = httpclient.HTTPRequest(
            "http://localhost:" + port + self.request.uri,
            headers=headers,
            header_callback=self.header_callback,
            streaming_callback=self.streaming_callback,
        )
        response = yield client.fetch(request)
        if response.error is not None:
            response.rethrow()
        else:
            self.finish()

    def compute_etag(self):
        return None

    def header_callback(self, data):
        if not self.status_code_read:
            status = httputil.parse_response_start_line(data)
            self.set_status(status.code, status.reason)
            self.status_code_read = True
        else:
            for name, value in httputil.HTTPHeaders.parse(data).get_all():
                if name in self.header_keys:
                    self.add_header(name, value)
                else:
                    self.set_header(name, value)
                    self.header_keys.add(name)

    def streaming_callback(self, data):
        self.write(data)


class NengoGuiWSHandler(IPythonHandler, WebSocketHandler):
    def open(self, port, query_str):
        self.ws = None
        url = "ws://localhost:" + port + self.request.uri
        headers = httputil.HTTPHeaders()
        for name, value in self.request.headers.get_all():
            if name.lower() == "host":
                headers.add(name, "localhost:" + port)
            elif name.lower() == "origin":
                headers.add(name, "http://localhost:" + port)
            else:
                headers.add(name, value)
        request = httpclient.HTTPRequest(url, headers=headers)
        websocket_connect(
            request,
            callback=self.conn_callback,
            on_message_callback=self.on_message_callback,
        )

    def conn_callback(self, ws):
        self.ws = ws.result()

    def on_message(self, message):
        if isinstance(message, bytes):
            self.ws.write_message(message, binary=True)
        else:
            self.ws.write_message(message)

    def on_close(self):
        self.ws.close(self.close_code, self.close_reason)

    def on_message_callback(self, message):
        if message is None:
            self.close()
        elif isinstance(message, bytes):
            self.write_message(message, binary=True)
        else:
            self.write_message(message)


class AvailabilityCheckHandler(IPythonHandler):
    def get(self):
        self.finish("OK")


class StartGuiHandler(IPythonHandler):
    def set_default_headers(self):
        self.set_header("Content-Type", "application/json")

    def get(self):
        server = LabServerManager.start_server(self.base_url)
        self.finish(
            json.dumps(
                {"port": server.server.server_port, "token": server.server.auth_token}
            )
        )


class RedirectHandler(IPythonHandler):
    def get(self, port, resource):
        self.redirect(
            url_path_join(self.base_url, "nengo", port, resource)
            + "/?"
            + self.request.query,
            permanent=True,
        )


def _jupyter_server_extension_paths():
    return []


def load_jupyter_server_extension(nb_server_app):
    web_app = nb_server_app.web_app
    host_pattern = ".*$"
    availability_check_pattern = url_path_join(
        web_app.settings["base_url"], ".*/nengo/check"
    )
    start_gui_pattern = url_path_join(web_app.settings["base_url"], "/nengo/start_gui")
    ws_route_pattern = url_path_join(
        web_app.settings["base_url"], "/nengo/(\\d+)/viz_component(\\?.*)?$"
    )
    route_pattern = url_path_join(web_app.settings["base_url"], "/nengo/(\\d+)/.*$")
    redirect_pattern = url_path_join(
        web_app.settings["base_url"], ".+/nengo/(\\d+)/(.*)$"
    )
    web_app.add_handlers(
        host_pattern,
        [
            (availability_check_pattern, AvailabilityCheckHandler),
            (start_gui_pattern, StartGuiHandler),
            (ws_route_pattern, NengoGuiWSHandler),
            (route_pattern, NengoGuiHandler),
            (redirect_pattern, RedirectHandler),
        ],
    )
