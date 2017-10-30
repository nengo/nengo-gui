from __future__ import print_function

import atexit
import socket
import threading
import time
import uuid
import warnings
import weakref
try:
    from urllib.request import urlopen
except ImportError:
    from urllib2 import urlopen

from IPython import get_ipython
from IPython.display import display, HTML

from notebook.utils import url_path_join
from notebook.base.handlers import IPythonHandler
from tornado import httpclient
from tornado import httputil
from tornado.simple_httpclient import SimpleAsyncHTTPClient
from tornado import web
from tornado.websocket import websocket_connect, WebSocketHandler

import nengo_gui


class ConfigReuseWarning(UserWarning):
    pass


class IPythonViz(object):
    servers = weakref.WeakValueDictionary()
    threads = weakref.WeakValueDictionary()
    configs = set()

    host = 'localhost'

    def __init__(self, model, cfg=None, height=600):
        self.height = height

        self._started = False

        if cfg is None:
            cfg = get_ipython().mktempfile()

        self._server_thread, server = self.start_server(cfg, model)
        self.port = server.server.server_port
        server.server.settings.prefix = '/nengo/' + str(self.port)

        self.resource = self.get_resource(
            self.port, token=server.server.auth_token)
        self.url = self.get_url(
            self.host, self.port, token=server.server.auth_token)

    @classmethod
    def get_resource(cls, port, action=None, token=None):
        url = '/nengo/{port}/'.format(port=port)
        if action is not None:
            url += action
        if token is not None:
            url += '?token=' + token
        return url

    @classmethod
    def get_url(cls, host, port, action=None, token=None):
        return 'http://{host}:{port}{resource}'.format(
            host=host, port=port,
            resource=cls.get_resource(port, action=action, token=token))

    @classmethod
    def start_server(cls, cfg, model):
        # Make sure only one server is writing the same config.
        server_thread = cls.threads.get(cfg, None)
        server = cls.servers.get(cfg, None)
        existent = server_thread is not None and server is not None
        if existent and server_thread.is_alive():
            warnings.warn(ConfigReuseWarning(
                "Reusing config. Only the most recent visualization will "
                "update the config."))
            for page in server.server.pages:
                page.save_config(force=True)
                page.filename_cfg = get_ipython().mktempfile()
                cls.servers[page.filename_cfg] = server
                cls.threads[page.filename_cfg] = server_thread

        name = model.label
        server_settings = nengo_gui.guibackend.GuiServerSettings(
            ('localhost', 0))
        model_context = nengo_gui.guibackend.ModelContext(
            model=model, locals=get_ipython().user_ns, filename=None,
            writeable=False)
        page_settings = nengo_gui.page.PageSettings(
            filename_cfg=cfg,
            editor_class=nengo_gui.components.editor.NoEditor)
        server = nengo_gui.gui.BaseGUI(
            model_context, server_settings, page_settings)
        server_thread = threading.Thread(target=server.start)
        server_thread.start()
        cls.servers[cfg] = server
        cls.threads[cfg] = server_thread
        cls.configs.add(cfg)
        return server_thread, server

    def wait_for_startup(self):
        while self._server_thread.is_alive() and not self._started:
            try:
                s = socket.create_connection((self.host, self.port), 0.1)
                self._started = True
            except Exception:
                pass
            else:
                s.close()

    @classmethod
    def shutdown_all(cls, timeout=None):
        def get_timeout(start=time.clock()):
            if timeout is None:
                return None
            else:
                return max(0.001, timeout - (time.clock() - start))

        for cfg in cls.configs:
            server = cls.servers.get(cfg, None)
            server_thread = cls.threads.get(cfg, None)
            if server_thread is not None and server_thread.is_alive():
                if server is not None:
                    urlopen(
                        cls.get_url(cls.host, server.server_port, 'shutdown'),
                        timeout=get_timeout()).read()
                server_thread.join(get_timeout())

    def _ipython_display_(self):
        self.wait_for_startup()
        if self._server_thread.is_alive():
            display(HTML('''
                <div id="{id}">
                    <iframe
                        src="{url}"
                        width="100%"
                        height="{height}"
                        frameborder="0"
                        class="cell"
                        style="border: 1px solid #eee;"
                        allowfullscreen></iframe>
                </div>
            '''.format(
                url=self.resource, id=uuid.uuid4(), height=self.height)))
        else:
            print("Server is not alive.")


atexit.register(IPythonViz.shutdown_all, timeout=5)


class NengoGuiHandler(IPythonHandler):
    def __init__(self, *args, **kwargs):
        super(NengoGuiHandler, self).__init__(*args, **kwargs)
        self.header_lines = 0

    @web.asynchronous
    def get(self, port):
        client = httpclient.AsyncHTTPClient()
        headers = httputil.HTTPHeaders()
        for name, value in self.request.headers.get_all():
            if name.lower() == 'host':
                headers.add(name, 'localhost:' + port)
            elif name.lower() == 'origin':
                headers.add(name, 'http://localhost:' + port)
            else:
                headers.add(name, value)
        request = httpclient.HTTPRequest(
            'http://localhost:' + port + self.request.uri,
            headers=headers,
            header_callback=self.header_callback,
            streaming_callback=self.streaming_callback)
        client.fetch(request, self.async_callback)

    def compute_etag(self):
        return None

    def header_callback(self, data):
        if self.header_lines == 0:
            status = httputil.parse_response_start_line(data)
            self.set_status(status.code, status.reason)
        else:
            for name, value in httputil.HTTPHeaders.parse(data).get_all():
                self.add_header(name, value)
        self.header_lines += 1

    def streaming_callback(self, data):
        self.write(data)

    def async_callback(self, response):
        if response.error:
            print('err', response.error)  # TODO error handling
        else:
            self.finish()


class NengoGuiWSHandler(IPythonHandler, WebSocketHandler):
    def open(self, port, query_str):
        self.ws = None
        url = 'ws://localhost:' + port + self.request.uri
        headers = httputil.HTTPHeaders()
        for name, value in self.request.headers.get_all():
            if name.lower() == 'host':
                headers.add(name, 'localhost:' + port)
            elif name.lower() == 'origin':
                headers.add(name, 'http://localhost:' + port)
            else:
                headers.add(name, value)
        request = httpclient.HTTPRequest(url, headers=headers)
        websocket_connect(
            request, callback=self.conn_callback,
            on_message_callback=self.on_message_callback)

    def conn_callback(self, ws):
        self.ws = ws.result()

    def on_message(self, message):
        if isinstance(message, bytes):
            self.ws.write_message(message, binary=True)
        else:
            self.ws.write_message(message)

    def on_close(self):
        self.ws.close()

    def on_message_callback(self, message):
        # FIXME websocket might already be closed
        if isinstance(message, bytes):
            self.write_message(message, binary=True)
        else:
            self.write_message(message)


def load_jupyter_server_extension(nb_server_app):
    web_app = nb_server_app.web_app
    host_pattern = '.*$'
    ws_route_pattern = url_path_join(
        web_app.settings['base_url'], '/nengo/(\\d+)/viz_component(\\?.*)?$')
    route_pattern = url_path_join(
        web_app.settings['base_url'], '/nengo/(\\d+)/.*$')
    web_app.add_handlers(host_pattern, [
        (ws_route_pattern, NengoGuiWSHandler),
        (route_pattern, NengoGuiHandler),
    ])
