from StringIO import StringIO

from nengo_gui.backend import server


class SocketMock(object):
    def __init__(self, request_data):
        self.request_data = request_data

    def makefile(self, mode='r', bufsize=1024):
        return StringIO(self.request_data)


class TestHttpWsRequestHandler(object):
    def test_get(self):
        request = SocketMock('''GET / HTTP/1.1
Host: localhost
User-Agent: nengo_gui
''')

        class HandlerClass(server.HttpWsRequestHandler):
            def __init__(self, request, client_address, srv):
                self.method_called = False
                server.HttpWsRequestHandler.__init__(
                    self, request, client_address, srv)

            def do_GET(self):
                self.method_called = True
                assert self.path == '/'
                assert self.headers.getheader('host', 'localhost')
                assert self.headers.getheader('user-agent', 'nengo_gui')

        handler = HandlerClass(request, 'localhost', 'localhost')
        assert handler.method_called
