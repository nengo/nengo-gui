import re

try:
    from io import BytesIO
except ImportError:  # Python 2.7
    from BytesIO import BytesIO

from nengo_gui import server


class TwoWayStringIO(object):
    def __init__(self, readable_data):
        self.readable_data = readable_data
        self.read_buffer = BytesIO(self.readable_data)
        self.write_buffer = BytesIO()
        self.written_data = None
        self.closed = False

    def read(self, *args, **kwargs):
        return self.read_buffer.read(*args, **kwargs)

    def readline(self, *args, **kwargs):
        return self.read_buffer.readline(*args, **kwargs)

    def write(self, *args, **kwargs):
        return self.write_buffer.write(*args, **kwargs)

    def close(self):
        self.closed = True
        self.written_data = self.write_buffer.getvalue()
        self.read_buffer.close()

    def flush(self):
        self.write_buffer.flush()


class ServerMock(object):
    server_name = "localhost"
    server_port = 80

    def create_websocket(self, socket):
        return server.WebSocket(socket)


class SocketMock(object):
    def __init__(self, request_data):
        self.request_data = request_data.encode("utf-8")
        self.file_io = TwoWayStringIO(self.request_data)

    def makefile(self, mode="r", bufsize=1024):
        return self.file_io

    def send(self, data):
        self.file_io.write(data)
        return len(data)

    def sendall(self, data):
        self.send(data)

    def setblocking(self, value):
        pass


class TestHttpWsRequestHandler(object):
    def test_get(self):
        request = SocketMock(
            """GET / HTTP/1.1
Host: localhost
User-Agent: nengo_gui
"""
        )

        class HandlerClass(server.HttpWsRequestHandler):
            def __init__(self, request, client_address, srv):
                self.method_called = False
                server.HttpWsRequestHandler.__init__(self, request, client_address, srv)

            def http_GET(self):
                self.method_called = True
                assert self.path == "/"
                assert self.headers.get("host").lower() == "localhost"
                assert self.headers.get("user-agent").lower() == "nengo_gui"

        handler = HandlerClass(request, "localhost", ServerMock())
        assert handler.method_called

    def test_upgrade_to_websocket(self):
        request = SocketMock(
            """GET /resource_name HTTP/1.1
Upgrade: websocket
Connection: Upgrade
Origin: http://localhost:80
Host: localhost:80
Sec-WebSocket-Key: AQIDBAUGBwgJCgsMDQ4PEC==
Sec-WebSocket-Version: 13
"""
        )

        class HandlerClass(server.HttpWsRequestHandler):
            def ws_default(self):
                pass

            def get_expected_origins(self):
                return ["localhost:80"]

        handler = HandlerClass(request, "localhost", ServerMock())
        assert handler
        # Ignore errors in decoding because binary WebSocket data might follow
        # response.
        response = request.file_io.written_data.decode("utf-8", errors="ignore")

        assert re.match(r"^HTTP\/\d+\.\d+\s+101.*$", response, re.M)
        assert re.search(r"^Upgrade:\s+.*websocket.*$", response, re.M | re.I)
        assert re.search(r"^Connection:\s+.*upgrade.*$", response, re.M | re.I)
        assert re.search(
            r"^Sec-WebSocket-Accept:\s+OfS0wDaT5NoxF2gqm7Zj2YtetzM=\s+$", response, re.M
        )

    def test_bad_upgrade_to_websocket(self):
        request = SocketMock(
            """GET /resource_name HTTP/1.1
Upgrade: websocket
Connection: Upgrade
Origin: http://localhost:80
Host: localhost:80
Sec-WebSocket-Key: null
Sec-WebSocket-Version: 13
"""
        )

        class HandlerClass(server.HttpWsRequestHandler):
            def get_expected_origins(self):
                return ["localhost:80"]

        handler = HandlerClass(request, "localhost", ServerMock())
        assert handler
        response = request.file_io.written_data.decode("utf-8")

        assert re.match(r"^HTTP\/\d+\.\d+\s+400.*$", response, re.M)

    def test_parsing_resource_get(self):
        request = SocketMock("GET /res/file?p1=1&p2=2&p1=0 HTTP/1.1\r\n")

        class HandlerClass(server.HttpWsRequestHandler):
            def http_default(self):
                pass

        handler = HandlerClass(request, "localhost", ServerMock())
        assert handler.resource == "/res/file"
        assert handler.query == {"p1": ["1", "0"], "p2": ["2"]}
        assert handler.db == {"p1": "1", "p2": "2"}

    def test_parsing_resource_post(self):
        content = "p2=3&p3=0"
        request = SocketMock(
            """POST /res/file?p1=1&p2=2&p1=0 HTTP/1.1
Content-Type:application/x-www-form-urlencoded; charset=UTF-8
Content-Length: {len}

{content}
""".format(
                len=len(content), content=content
            )
        )

        class HandlerClass(server.HttpWsRequestHandler):
            def http_default(self):
                pass

        handler = HandlerClass(request, "localhost", ServerMock())
        assert handler.resource == "/res/file"
        assert handler.query == {"p1": ["1", "0"], "p2": ["2"]}
        assert handler.db == {"p1": "1", "p2": "3", "p3": "0"}

    def test_http_dispatch(self):
        request = SocketMock("GET /file HTTP/1.1\r\n")

        class HandlerClass(server.HttpWsRequestHandler):
            called = False
            http_commands = {"/file": "cmd"}

            def cmd(self):
                self.called = True
                return b""

        handler = HandlerClass(request, "localhost", ServerMock())
        assert handler.called

    def test_ws_dispatch(self):
        request = SocketMock(
            """GET /ws HTTP/1.1
Upgrade: websocket
Connection: Upgrade
Origin: http://localhost:80
Host: localhost:80
Sec-WebSocket-Key: AQIDBAUGBwgJCgsMDQ4PEC==
Sec-WebSocket-Version: 13
"""
        )

        class HandlerClass(server.HttpWsRequestHandler):
            called = False
            ws_commands = {"/ws": "cmd"}
            server = ServerMock()

            def cmd(self):
                self.called = True

            def get_expected_origins(self):
                return ["localhost:80"]

        handler = HandlerClass(request, "localhost", ServerMock())
        assert handler.called
        assert handler.ws.state in [
            server.WebSocket.ST_CLOSING,
            server.WebSocket.ST_CLOSED,
        ]
