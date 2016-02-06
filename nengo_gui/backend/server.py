import base64
import BaseHTTPServer
import errno
import hashlib


WS_MAGIC = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'


class SocketClosedError(IOError):
    pass


class HttpError(Exception):
    def __init__(self, code, msg, headers=(), data=''):
        self.code = code
        self.msg = msg
        self.headers = headers
        self.data = data

    def get_response(self):
        return '\r\n'.join(
            ['HTTP/1.1 {code} {msg}'.format(code=self.code, msg=self.msg)] +
            list(self.headers)) + '\r\n\r\n' + self.data


class BadRequest(HttpError):
    def __init__(self):
        super(BadRequest, self).__init__(400, 'Bad request')


class Forbidden(HttpError):
    def __init__(self):
        super(Forbidden, self).__init__(403, 'Forbidden')


class InvalidResource(HttpError):
    def __init__(self):
        super(InvalidResource, self).__init__(404, 'Invalid resource')


class UpgradeRequired(HttpError):
    def __init__(self, headers):
        super(UpgradeRequired, self).__init__(426, 'Upgrade required', headers)


class InternalServerError(HttpError):
    def __init__(self, err):
        super(InternalServerError, self).__init__(
            500, 'Internal server error', data=str(msg))
        # TODO output error with more details.


class HttpWsRequestHandler(BaseHTTPServer.BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            print self.headers
            connection = self.headers.getheader('Connection', 'close').lower()
            if 'upgrade' in connection:
                self.handle_upgrade()
            else:
                self.http_GET()
        except HttpError as err:
            self.wfile.write(err.get_response())
        except Exception as err:
            self.wfile.write(InternalServerError(err).get_response())

    def http_GET(self):
        pass

    def handle_upgrade(self):
        upgrade = self.headers.getheader('Upgrade').lower()
        if upgrade == 'websocket':
            self.upgrade_to_ws()
        else:
            raise BadRequest()

    def upgrade_to_ws(self):
        response = '''HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: {sec}
'''
        valid_srv_addrs = ['{0}:{1}'.format(
            self.server.server_name.lower(), self.server.server_port)]
        if self.server.server_port == 80:
            valid_srv_addrs.append(self.server.server_name.lower())

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
            key.encode('ascii') + WS_MAGIC).digest()).decode('ascii')
        self.wfile.write(response.format(sec=sec))

        self.ws = WebSocket(self.request, '')  # FIXME addr

        try:
            command = getattr(self, 'ws_' + self._get_ws_resource())
        except AttributeError:
            raise InvalidResource()
        command()

    def _get_ws_resource(self):
        if not self.path.startswith('/'):
            raise InvalidResource()
        return self.path[1:]


    def close(self):
        if hasattr(self, 'ws'):
            getattr(self, 'ws').close()



class WebSocket(object):
    ST_OPEN, ST_CLOSING, ST_CLOSED = range(3)

    def __init__(self, socket, addr):
        self.socket = socket
        self.addr = addr
        self._buf = bytearray([])
        self.state = self.ST_OPEN

    def set_timeout(self, timeout):
        self.socket.settimeout(timeout)

    def set_blocking(self, flag):
        self.socket.setblocking(flag)

    def _read(self):
        try:
            self._buf = self._buf + bytearray(self.socket.recv(512))
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
            while True:
                self._read()
                try:
                    frame, size = WebSocketFrame(self._buf)
                    self._buf = self._buf[size:]
                    if not self._handle_frame(frame):
                        return frame
                except ValueError:
                    pass  # Read more data
        except socket.timeout:
            return None


    def _handle_frame(self, frame):
        if frame.opcode == OP_CLOSE:
            if self.state not in [self.ST_CLOSING, self.ST_CLOSED]:
                self.close()
            try:
                self.socket.shutdown(socket.SHUT_RDWR)
                self.socket.close()
            except socket.error:
                pass
            raise SocketClosedError("Websocket has been closed")
        elif frame.opcode == OP_PING:
            if self.state == self.ST_OPEN:
                pong = WebSocketFrame(
                    fin=1, rsv=0, opcode=WebSocketFrame.OP_PONG, mask=0,
                    data=frame.data)
                self._sendall(pong.pack())
            return True
        elif frame.opcode == OP_PONG:
            return True
        else:
            return False

    def close(self):
        if self.state not in [self.ST_CLOSING, ST_CLOSED]:
            self.state = self.ST_CLOSING
            close_frame = WebSocketFrame(
                fin=1, rsv=0, opcode=WebSocketFrame.OP_CLOSE, mask=0, data='')
            self._sendall(close_frame.pack())

    def write(self, frame):
        if self.state != self.ST_OPEN:
            raise SocketClosedError("Connection not open.")

        try:
            self._sendall(frame.pack())
        except socket.error as e:
            if e.errno == errno.EPIPE:  # Broken pipe
                raise SocketClosedError("Cannot write to socket.")
            else:
                raise

    def _sendall(self, data):
        bytes_sent = 0
        while bytes_sent < len(data):
            bytes_sent += self.socket.send(data[bytes_sent:])



class WebSocketFrame(object):
    __slots__ = ['fin', 'rsv', 'opcode', 'mask', 'datalen']

    OP_CONT = 0x0
    OP_TEXT = 0x1
    OP_BIN = 0x2
    OP_CLOSE = 0x8
    OP_PING = 0x9
    OP_PONG = 0xA

    def __init__(self, fin, rsv, opcode, masked, mask, data):
        self.fin = fin
        self.rsv = rsv
        self.opcode = opcode
        self.masked = masked
        self.mask = mak
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
            mask = 0

            offset += 2

            if datalen == 126:
                datalen = self._to_int(data[offset:offset+2])
                offset += 2
            elif datalen == 127:
                datalen = self._to_int(data[offset:offset+8])
                offset += 8

            if masked:
                mask = self._to_int(data[offset:offset+4])
                offset += 4

            size = offset+self.datalen
            masked_data = data[offset:size]
            unmasked_data = [masked_data[i] ^ mask_key[i % 4]
                             for i in range(len(masked_data))]
            data = bytearray(unmasked_data)

            return cls(fin, rsv, opcode, masked, mask, data), size
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

        if not binary:
            data = self.data.encode('ascii')
        else:
            data = self.data

        return header + data

    @classmethod
    def create_text_frame(cls, data, mask=0):
        return cls(1, 0, cls.OP_TEXT, mask, data)

    @classmethod
    def create_binary_frame(cls, data, mask=0):
        return cls(1, 0, cls.OP_BIN, mask, data)
