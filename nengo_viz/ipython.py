import nengo_viz
from IPython.display import display, HTML
import socket
import tempfile
import threading
import uuid


class IPythonViz(object):
    def __init__(self, model, height=600):
        nengo_viz.server.Server.log_file = None

        self.height = height

        self._started = False

        self.cfg = tempfile.NamedTemporaryFile()
        self.viz = nengo_viz.Viz(
            self.cfg.name, model=model, locals=get_ipython().user_ns)
        server = self.viz.prepare_server(port=0, browser=False)

        self.host = 'localhost'
        self.port = server.server_port

        self._server_thread = threading.Thread(
            target=self.viz.begin_lifecycle,
            kwargs={'server': server, 'interactive': False})
        self._server_thread.start()

        self.url = 'http://{host}:{port}'.format(host=self.host, port=self.port)

    def __del__(self):
        self.shutdown()

    def wait_for_startup(self):
        while self._server_thread.is_alive() and not self._started:
            try:
                s = socket.create_connection(('localhost', self.port), 0.1)
                self._started = True
            except:
                pass
            else:
                s.close()

    def shutdown(self, timeout=None):
        if self._server_thread.is_alive():
            # This code might run as part of %reset which might have unloaded
            # prior imports of urllib2
            import urllib2
            urllib2.urlopen(self.url + '/shutdown', timeout=timeout).read()
        self._server_thread.join()

    def _ipython_display_(self):
        self.wait_for_startup()
        if self._server_thread.is_alive():
            display(HTML('''
                <div id="{id}">
                    <form>
                        <input
                            type="button"
                            onclick="
                                var target = $('#{id} iframe');
                                target.attr('src', '{url}' + '/shutdown');
                                target.load(function () {{ $('#{id}').replaceWith('') }});"
                            value="Close viz" />
                    </form>
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
