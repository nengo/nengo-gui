import base64
import errno
import hashlib
import socket
import ssl
import struct
import warnings

from .auth import AuthenticatedHttpRequestHandler
from .compat import urlparse
from .exceptions import (
    BadRequest, Forbidden, InvalidResource, SocketClosedError, UpgradeRequired)
from .http import ManagedThreadHttpServer

WS_MAGIC = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'


def _sendall(socket, data):
    bytes_sent = 0
    while bytes_sent < len(data):
        bytes_sent += socket.send(data[bytes_sent:])


class WebSocketFrame(object):
    __slots__ = ('fin', 'rsv', 'opcode', 'mask', 'data')

    OP_CONT = 0x0
    OP_TEXT = 0x1
    OP_BIN = 0x2
    OP_CLOSE = 0x8
    OP_PING = 0x9
    OP_PONG = 0xA

    def __init__(self, fin, rsv, opcode, mask, data):
        self.fin = fin
        self.rsv = rsv
        self.opcode = opcode
        self.mask = mask
        self.data = data

    @classmethod
    def parse(cls, data):
        try:
            offset = 0

            fin = (data[0] >> 7) & 0x1
            rsv = (data[0] >> 4) & 0x07
            opcode = data[0] & 0x0F
            masked = (data[1] >> 7) & 0x01
            datalen = data[1] & 0x7F
            mask = b'\x00\x00\x00\x00'

            offset += 2

            if datalen == 126:
                datalen = cls._to_int(data[offset:offset+2])
                offset += 2
            elif datalen == 127:
                datalen = cls._to_int(data[offset:offset+8])
                offset += 8

            if masked:
                mask = data[offset:offset+4]
                offset += 4

            size = offset + datalen
            masked_data = data[offset:size]
            if len(masked_data) < datalen:
                raise IndexError()
            unmasked_data = [masked_data[i] ^ mask[i % 4]
                             for i in range(len(masked_data))]
            data = bytearray(unmasked_data)
            if opcode == cls.OP_TEXT:
                data = data.decode('ascii')

            return cls(fin, rsv, opcode, mask, data), size
        except IndexError:
            raise ValueError('Frame incomplete.')

    @classmethod
    def _to_int(cls, data):
        value = 0
        for b in data:
            value = (value << 8) + b
        return value

    def pack(self):
        code = (self.fin & 0x01) << 7
        code |= (self.rsv & 0x07) << 4
        code |= self.opcode & 0x0F

        datalen = len(self.data)
        mask_bit = ((self.mask != 0) & 0x01) << 7
        if datalen < 126:
            header = struct.pack('!BB', code, datalen | mask_bit)
        elif datalen <= 0xFFFF:
            header = struct.pack('!BBH', code, 126 | mask_bit, datalen)
        else:
            header = struct.pack('!BBQ', code, 127 | mask_bit, datalen)

        data = self.data

        return header + data

    @classmethod
    def create_text_frame(cls, text, mask=0):
        return cls(1, 0, cls.OP_TEXT, mask, text.encode('utf-8'))

    @classmethod
    def create_binary_frame(cls, data, mask=0):
        return cls(1, 0, cls.OP_BIN, mask, data)


class WebSocket(object):
    ST_OPEN, ST_CLOSING, ST_CLOSED = range(3)

    def __init__(self, socket):
        self.socket = socket
        self._buf = bytearray([])
        self.state = self.ST_OPEN

    def set_timeout(self, timeout):
        self.socket.settimeout(timeout)

    def set_blocking(self, flag):
        self.socket.setblocking(flag)

    def _read(self):
        try:
            self._buf = self._buf + bytearray(self.socket.recv(512))
        except ssl.SSLError as e:
            if e.errno == 2:
                # Corresponds to SSLWantReadError which only exists in Python
                # 2.7.9+ and 3.3+.
                pass
            else:
                raise
        except socket.error as e:
            if e.errno in [errno.EDEADLK, errno.EAGAIN, 10035]:
                # no data available
                pass
            elif e.errno == errno.EBADF:
                raise SocketClosedError("Cannot read from closed socket.")
            else:
                raise

    def read_frame(self):
        try:
            self._read()
            frame, size = WebSocketFrame.parse(self._buf)
            self._buf = self._buf[size:]
            if not self._handle_frame(frame):
                return frame
        except ValueError:
            return None
        except socket.timeout:
            return None

    def _handle_frame(self, frame):
        if frame.opcode == WebSocketFrame.OP_CLOSE:
            if self.state not in [self.ST_CLOSING, self.ST_CLOSED]:
                self.close()
            raise SocketClosedError("Websocket has been closed")
        elif frame.opcode == WebSocketFrame.OP_PING:
            if self.state == self.ST_OPEN:
                pong = WebSocketFrame(
                    fin=1, rsv=0, opcode=WebSocketFrame.OP_PONG, mask=0,
                    data=frame.data)
                _sendall(self.socket, pong.pack())
            return True
        elif frame.opcode == WebSocketFrame.OP_PONG:
            return True
        else:
            return False

    def close(self):
        if self.state not in [self.ST_CLOSING, self.ST_CLOSED]:
            self.state = self.ST_CLOSING
            close_frame = WebSocketFrame(
                fin=1, rsv=0, opcode=WebSocketFrame.OP_CLOSE, mask=0, data=b'')
            try:
                _sendall(self.socket, close_frame.pack())
            except socket.error as err:
                if err.errno in [errno.EPIPE, errno.EBADF]:
                    pass

    def write_frame(self, frame):
        if self.state != self.ST_OPEN:
            raise SocketClosedError("Connection not open.")

        try:
            _sendall(self.socket, frame.pack())
        except socket.error as e:
            if e.errno == errno.EPIPE:  # Broken pipe
                raise SocketClosedError("Cannot write to socket.")
            else:
                raise

    def write_text(self, text):
        self.write_frame(WebSocketFrame.create_text_frame(text))

    def write_binary(self, data):
        self.write_frame(WebSocketFrame.create_binary_frame(data))


class ManagedThreadHttpWsServer(ManagedThreadHttpServer):
    """Threaded HTTP and WebSocket server."""

    def __init__(self, *args, **kwargs):
        ManagedThreadHttpWsServer.__init__(self, *args, **kwargs)
        self._websockets = []

    @property
    def websockets(self):
        return self._websockets[:]

    def create_websocket(self, socket):
        ws = WebSocket(socket)
        self._websockets.append(ws)
        return ws

    def _shutdown(self):
        for ws in self.websockets:
            ws.close()
        ManagedThreadHttpWsServer._shutdown(self)


class AuthenticatedHttpWsRequestHandler(AuthenticatedHttpRequestHandler):
    """Base class for request handler for normal and websocket requests.

    ``http_commands`` and ``ws_commands`` are dictionaries mapping resource
    names (with leading '/') to function names (as string) in this class.
    These functions do not take any arguments except for `self`. All required
    data is defined as attributes on the instance. In addition to the
    attributes provided by the `.BaseHTTPRequestHandler`, the resource name is
    provided as ``resource``, the parsed query string (as dictionary) as
    ``query`` and combined query string and post fields as ``db``.
    In a websocket command handler function ``ws`` provides access
    to the websocket.

    If no handler function for a resource was defined, the ``http_default`` and
    ``ws_default`` functions will be used.
    """

    _ws_routes = {}

    def __init__(self, *args, **kwargs):
        self.ws = None
        AuthenticatedHttpRequestHandler.__init__(self, *args, **kwargs)

    def handle_upgrade(self):
        upgrade = self.headers.get('Upgrade').lower()
        if upgrade == 'websocket':
            self.upgrade_to_ws()
        AuthenticatedHttpRequestHandler.handle_upgrade(self)

    def upgrade_to_ws(self):
        response = "\n".join([
            "HTTP/1.1 101 Switching Protocols",
            "Upgrade: websocket",
            "Connection: Upgrade",
            "Sec-WebSocket-Accept: {sec}",
            ""
        ])

        valid_srv_addrs = self.get_expected_origins()

        try:
            origin = urlparse(self.headers['Origin'])
            assert origin.netloc.lower() in valid_srv_addrs
        except KeyError:
            raise Forbidden()
        except AssertionError:
            raise Forbidden()

        try:
            host = self.headers['Host'].lower()
            assert host in valid_srv_addrs
            key = self.headers['Sec-WebSocket-Key']
            assert len(base64.b64decode(key)) == 16
        except KeyError:
            raise BadRequest()
        except AssertionError:
            raise BadRequest()

        if self.headers['Sec-WebSocket-Version'] != '13':
            raise UpgradeRequired(['Sec-WebSocket-Version: 13'])

        sec = base64.b64encode(hashlib.sha1(
            (key + WS_MAGIC).encode('ascii')).digest()).decode('ascii')
        _sendall(self.request, response.format(sec=sec).encode('utf-8'))

        self.ws = self.server.create_websocket(self.request)
        self.ws.set_blocking(False)

        endpoint = self._get_endpoint(self._ws_routes, self.route)
        if endpoint is None:
            self.ws_default()
        else:
            endpoint(self)
        self.ws.close()

    def ws_default(self):
        raise InvalidResource(self.path)

    @classmethod
    def ws_route(cls, route):
        def _ws_route(endpoint):
            if route in cls._ws_routes:
                warnings.warn("Websocket route %r was overwritten" % (route,))
            cls._ws_routes[route] = endpoint
            return endpoint
        return _ws_route
