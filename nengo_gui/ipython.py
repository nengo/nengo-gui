import atexit
import socket
import threading
import time
import urllib2
import uuid
import warnings
import weakref

from IPython import get_ipython
from IPython.display import display, HTML

import nengo_gui


class ConfigReuseWarning(UserWarning):
    pass


class IPythonViz(object):
    servers = weakref.WeakValueDictionary()
    threads = weakref.WeakValueDictionary()
    configs = set()

    host = 'localhost'

    def __init__(self, model, cfg=None, height=600):
        nengo_gui.server.Server.log_file = None

        self.height = height

        self._started = False

        if cfg is None:
            cfg = get_ipython().mktempfile()

        self._server_thread, server = self.start_server(cfg, model)
        self.port = server.server_port

        self.url = self.get_url(self.host, self.port)


    @staticmethod
    def get_url(host, port, action=None):
        url = 'http://{host}:{port}'.format(host=host, port=port)
        if action is not None:
            url += '/' + action
        return url

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
            server.viz.save_config(force=True)
            server.viz.cfg = get_ipython().mktempfile()
            cls.servers[server.viz.cfg] = server
            cls.threads[server.viz.cfg] = server_thread

        name = model.label if model.label is not None else ''
        viz = nengo_gui.Viz(
            name, cfg=cfg, model=model, locals=get_ipython().user_ns,
            interactive=False, allow_file_change=False)
        server = viz.prepare_server(viz, port=0, browser=False)
        server_thread = threading.Thread(
            target=viz.begin_lifecycle,
            kwargs={'server': server})
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
            except:
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
                    urllib2.urlopen(
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
            '''.format(url=self.url, id=uuid.uuid4(), height=self.height)))
        else:
            print "Server is not alive."


atexit.register(IPythonViz.shutdown_all, timeout=5)
