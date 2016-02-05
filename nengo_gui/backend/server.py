import base64
import BaseHTTPServer
import hashlib


WS_MAGIC = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'

class HttpWsRequestHandler(BaseHTTPServer.BaseHTTPRequestHandler):
    def do_GET(self):
        connection = self.headers.getheader('Connection', 'close').lower()
        if connection == 'upgrade':
            self.handle_upgrade()
        else:
            self.http_GET()

    def http_GET(self):
        pass

    def handle_upgrade(self):
        upgrade = self.headers.getheader('Upgrade').lower()
        if upgrade == 'websocket':
            self.upgrade_to_ws()
        else:
            pass  # FIXME produce error

    def upgrade_to_ws(self):
        response = '''HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: {sec}
'''


        try:
            # FIXME check
            # A |Host| header field containing the server's authority.
            key = self.headers['Sec-WebSocket-Key']
            assert len(base64.b64decode(key)) == 16
            assert self.headers['Sec-WebSocket-Version'] == '13'
        except KeyError, AssertionError:
            pass # FIXME Bad request

        sec = base64.b64encode(hashlib.sha1(
            key.encode('ascii') + WS_MAGIC).digest()).decode('ascii')

        self.wfile.write(response.format(sec=sec))

        # TODO handle communication
