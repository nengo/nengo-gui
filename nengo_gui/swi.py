"""
Simple Web Interface
Author: Terry Stewart terry.stewart@gmail.com http://terrystewart.ca

This software is released under the GNU General Public License.
See http://www.gnu.org/copyleft/gpl.html for more details.


Simple Web Interface is a fast way to create Python programs that serve
  dynamic web pages, without a heavyweight infrastructure.  Everything is
  in this one file.  You simply define a class, and the methods in that
  class will be called to create the various web pages.

An HTTP request for http://server/page?a=val1&b=val2 will result in a call to
    def swi_page(self,a,b)
  and 'a' will get the value 'val1' and 'b' will be 'val2'.  You can also
  define defaults for these arguments, and it will use those if they
  are unspecified.  This method will also be called for a request like this:
    http://server/page/val1/val2
  There is no limitation on the number of arguments.  The system supports
  both GET and POST (and multipart POST, so file uploading will work).

The system also supports a cookie-based login system.  You can define users
  with swi.addUser(name,password).  You can then check for logins by adding
  this to the beginning of your methods:
    if self.user==None:
      return self.default_login_form()
  You can log out by causing a call to self.log_out().

Websockets are also supported via functions that begin with ws_:
    # ws://server/data
    def ws_data(self, client):
        while True:
            msg = client.read()
            if msg is not None:
                client.write('received: ' + msg)
"""

import base64
try:
    import BaseHTTPServer
except ImportError:
    import http.server as BaseHTTPServer
import errno
import hashlib
try:
    import mimetools
except ImportError:
    import email as mimetools
import mimetypes
try:
    import multifile
except ImportError:
    import email as multifile
import os
import random
import re
import select
import signal
import socket
try:
    import SocketServer
except ImportError:
    import socketserver as SocketServer
import string
import struct
try:
    import StringIO
except ImportError:
    import io as StringIO
import sys
import threading
import time
import traceback
import weakref
import webbrowser


class SocketClosedError(IOError):
    pass


# Does not really indicate an error state, thus derive from BaseException
# instead of Exception. (KeyboardInterrupt is doing the same thing.)
class ServerShutdown(BaseException):
    pass


class SimpleWebInterface(BaseHTTPServer.BaseHTTPRequestHandler):
    server_version = 'SimpleWebInterface/2.0'
    servers = []
    serve_files = []
    serve_dirs = []

    pending_headers = None
    testing_user = None
    attempted_login = False

    current_cookies = {}
    passwords = {}

    log_file = sys.stderr

    def add_header(self, key, value):
        if self.pending_headers is None:
            self.pending_headers = []
        self.pending_headers.append((key, value))

    def clear_headers(self):
        self.pending_headers = None

    def get_user_from_id(self, id, pwd):
        valid = len(self.passwords) == 0
        if id in self.passwords and pwd == self.passwords[id]:
            valid = True

        if valid:
            while 1:
                value = ''.join([random.choice(string.ascii_lowercase)
                                 for i in range(20)])
                if value not in self.current_cookies:
                    break
            self.add_header('Set-Cookie', 'id=' + value)
            self.current_cookies[value] = id
            return id
        else:
            return None

    @classmethod
    def add_user(cls, id, pwd):
        cls.passwords[id] = pwd

    def get_user_from_cookie(self):
        if 'cookie' in self.headers:
            cookie = self.headers['cookie']
            for c in cookie.split(';'):
                if '=' in c:
                    name, val = c.split('=', 1)
                    name = name.strip()
                    val = val.strip()
                    if name == 'id' and val in self.current_cookies:
                        return self.current_cookies[val]
        return None

    def log_out(self):
        for k, v in self.current_cookies.items():
            if v == self.user:
                del self.current_cookies[k]
        self.add_header('Set-Cookie:', 'id=0')

    def default_login_form(self, target=None, **data):
        if self.attempted_login:
            message = 'Invalid password.  Try again.'
        else:
            message = 'Enter your user name and password:'
        data = ''.join(['<input type=hidden name=%s value=%s>' % kv
                        for kv in data.items() if kv[1] is not None])

        if target is None:
            target = self.currentArgs[0]

        # for some reason, using POST here doesn't work under IE6, but does
        #  under Firefox and Safari.
        method = 'GET'
        if 'User-Agent' in self.headers:
            agent = self.headers['User-Agent']
            if 'MSIE' not in agent:
                method = 'POST'

        return """<form action="%s" method=%s>%s<br>
        <label for=swi_id>Username: </label><input type=text name=swi_id><br>
        <label for=swi_pwd>Password: </label><input type=password name=swi_pwd>
        %s
        <input type=submit value="Log In">
        </form>""" % (target, method, message, data)

    def swi_favicon_ico(self):
        return ('image/ico', favicon)

    def do_POST(self):
        self.clear_headers()
        data = self.rfile.read(int(self.headers['Content-Length'])).decode('ascii')
        if 'multipart/form-data' in self.headers['Content-Type']:
            db = self.make_db_from_multipart(data)
        else:
            db = self.make_db_from_line(data)
        if '?' in self.path:
            self.path, data = self.path.split('?', 1)
            db2 = self.make_db_from_line(data)
            db.update(db2)

        if self.path == '':
            self.path = '/'
        self.path = self.fix_text(self.path)
        args = self.path[1:].split('/')
        self.handle_request(args, db)

    def do_GET(self):
        self.clear_headers()
        if self.path == '':
            self.path = '/'
        self.path = self.fix_text(self.path)

        db = {}
        if '?' in self.path:
            self.path, data = self.path.split('?', 1)
            db = self.make_db_from_line(data)

        args = self.path[1:].split('/')
        self.handle_request(args, db)

    def handle_ws_request(self, args, db):
        MAGIC = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
        HSHAKE_RESP = ("HTTP/1.1 101 Switching Protocols\r\n"
                       "Upgrade: websocket\r\n"
                       "Connection: Upgrade\r\n"
                       "Sec-WebSocket-Accept: %s\r\n"
                       "\r\n")

        if args[0] == '':
            command = 'ws'
        else:
            command = 'ws_%s' % args[0]

        client = self.server.create_websocket(self.request)
        key = self.headers['Sec-WebSocket-Key'] + MAGIC
        key = key.encode('ascii')
        resp_data = (HSHAKE_RESP %
                     base64.b64encode(hashlib.sha1(key).digest()).decode('ascii'))
        client.socket.sendall(resp_data.encode('ascii'))
        client.set_blocking(False)

        self.user = self.get_user_from_cookie()
        if self.user is None and self.testing_user is not None:
            self.user = self.testing_user
        try:
            getattr(self, command)(*[client] + args[1:], **db)
        except socket.error as err:
            # Only print traceback if it isn't likely to be caused by the
            # server shutting down.
            if err.args[0] != errno.EPIPE and err.args[0] != errno.EBADF:
                traceback.print_exc()
        except Exception:
            traceback.print_exc()
        client.close()
        client.wait_for_close()

    def handle_request(self, args, db):
        self.currentArgs = args

        if 'Sec-WebSocket-Key' in self.headers:
            self.handle_ws_request(args, db)
            return

        if args[0] == '':
            command = 'swi'
        else:
            command = 'swi_%s' % args[0]
        command = command.replace('.', '_')

        if hasattr(self, command):
            ctype = 'text/html'
            self.user = self.get_user_from_cookie()
            if self.user is None and self.testing_user is not None:
                self.user = self.testing_user
            self.attempted_login = False
            if 'swi_id' in db and 'swi_pwd' in db:
                self.attempted_login = True
                self.user = self.get_user_from_id(db['swi_id'], db['swi_pwd'])
                del db['swi_id']
                del db['swi_pwd']
            elif len(self.passwords) == 0:
                self.user = self.get_user_from_id('', '')

            try:
                text = getattr(self, command)(*args[1:], **db)
            except:
                self.send_response(200)
                self.send_header('Content-type', 'text/html')
                self.end_headers()
                self.wfile.write("<html><body><pre>".encode("utf-8"))
                text = StringIO.StringIO()
                traceback.print_exc(file=text)
                text = text.getvalue()
                text = text.replace('<', '<')
                text = text.replace('>', '>')
                b = ("%s</pre></body></html>" % text).encode("utf-8")
                self.wfile.write(b)
                print(text)
            else:
                if isinstance(text, tuple):
                    ctype, text = text
                self.send_response(200)
                self.send_header('Content-type', ctype)
                if self.pending_headers is not None:
                    for k, v in self.pending_headers:
                        self.send_header(k, v)
                self.end_headers()
                if not isinstance(text, bytes):
                    text = text.encode("utf-8")
                self.wfile.write(text)
        elif self.path[1:] in self.serve_files:
            self.send_file(self.path[1:])
        elif self.path == '/robots.txt':
            self.send_response(200)
            self.send_header('Content-type', 'text/text')
            self.end_headers()
            self.wfile.write("User-agent: *\nDisallow: /".encode("utf-8"))
        else:
            for d in self.serve_dirs:
                if self.path[1:].startswith(d+'/'):
                    self.send_file(self.path[1:])
                    return
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(("<html><body>Invalid request:"
                              "<pre>args=%s</pre><pre>db=%s</pre>"
                              "</body></html>" % (args, db)).encode("utf-8"))

    def send_file(self, path):
        self.send_response(200)
        type, enc = mimetypes.guess_type(path)
        self.send_header('Content-type', type)
        self.send_header('Content-encoding', enc)
        self.end_headers()
        self.wfile.write(file(path, 'rb').read())

    def make_db_from_multipart(self, data):
        db = {}
        boundary = data[:data.find('\n') + 1].strip()
        n = len(boundary)

        i = 0
        while True:
            j = data.find(boundary, i+n)
            if j < 0:
                break

            content = data[i + n + 2:j - 2]
            m = re.search(r'name="([^"]+)"', content)
            name = m.group(1)
            k = content.find('\r\n\r\n') + 4
            val = content[k:]

            m = re.search(r'filename="([^"]+)"', content[:k])
            if m is not None:
                filename = m.group(1)
                val = (filename, val)

            db[name] = val

            i = j
        return db

    def make_db_from_line(self, data):
        if '\n' in data:
            data, x = data.split('\n', 1)
            data = data.strip()
        db = {}
        for line in data.split('&'):
            if '=' in line:
                key, val = line.split('=', 1)
                val = self.fix_text(val)
                key = self.fix_text(key)
                if key in db:
                    v = db[key]
                    if not isinstance(v, list):
                        v = [v]
                    v.append(val)
                    val = v
                db[key] = val
        return db

    def fix_text(self, val):
        val = val.replace('+', ' ')
        i = 0
        while i < len(val) - 2:
            if val[i] == '%' and (val[i + 1] in '1234567890abcdefABCDEF' and
                                  val[i + 2] in '1234567890abcdefABCDEF'):
                c = chr(int(val[i + 1:i + 3], 16))
                val = val[:i] + c + val[i + 3:]
            i += 1
        return val

    def log_message(self, format, *args):
        if self.log_file is not None:
            self.log_file.write( "%s - - [%s] %s\n" % (
                    self.client_address[0], self.log_date_time_string(),
                    format % args))

    @classmethod
    def start(cls, viz, port=80, asynch=True, addr='', browser=False, interactive=True):
        server = cls.prepare_server(viz, port, asynch, addr, browser)
        cls.begin_lifecycle(server, asynch, interactive=interactive)

    @classmethod
    def prepare_server(cls, gui,
                       port=80, asynch=True, addr='', browser=False):
        if asynch:
            server = AsyncHTTPServer((addr, port), cls)
        else:
            server = BaseHTTPServer.HTTPServer((addr, port), cls)
        server.gui = gui
        port = server.server_port
        if browser:
            cls.browser(port=port)

        cls.servers.append(server)
        return server

    @classmethod
    def _confirm_shutdown(cls, signum, frame):
        signal.signal(signal.SIGINT, cls._immediate_shutdown)
        sys.stdout.write("\nShut-down this web server (y/[n])? ")
        sys.stdout.flush()
        rlist, _, _ = select.select([sys.stdin], [], [], 10)
        if rlist:
            line = sys.stdin.readline()
            if line[0].lower() == 'y':
                raise ServerShutdown()
            else:
                print("Resuming...")
        else:
            print("No confirmation received. Resuming...")
        signal.signal(signal.SIGINT, cls._confirm_shutdown)

    @classmethod
    def _immediate_shutdown(cls, signum, frame):
        raise ServerShutdown()

    @classmethod
    def begin_lifecycle(cls, server, asynch=True, interactive=True):
        if interactive and not sys.platform.startswith('win'):
            signal.signal(signal.SIGINT, cls._confirm_shutdown)

        try:
            server.running = True
            server.serve_forever(poll_interval=0.02)
        except ServerShutdown:
            pass
        finally:
            server.running = False

            if interactive:
                print("Shutting down server...")

            ws_requests = []
            for ws in server.websockets:
                ws_requests.append(ws.socket)
                ws.close()

            # shut down any remaining threads
            # server.requests might be modified from other threads, so we need
            # a copy which we get in a thread-safe way be slicing it with [:].
            if asynch and server.requests is not None:
                for _, sock in server.requests:
                    if sock not in ws_requests:
                        try:
                            sock.shutdown(socket.SHUT_RDWR)
                            sock.close()
                        except socket.error:
                            pass

                for thread, _ in server.requests:
                    if thread.is_alive():
                        thread.join(0.05)

                n_zombie = sum(thread.is_alive()
                        for thread, _ in server.requests)
                if interactive and n_zombie > 0:
                    print("%d zombie threads will close abruptly" % n_zombie)

            cls.servers.remove(server)

    @classmethod
    def stop(cls):
        for server in cls.servers[:]:
            server.shutdown()

    @classmethod
    def browser(cls, port=80):
        threading.Thread(target=webbrowser.open,
                         args=('http://localhost:%d' % port,)).start()


class AsyncHTTPServer(SocketServer.ThreadingMixIn, BaseHTTPServer.HTTPServer):
    daemon_threads = True  # this ensures all spawned threads exit

    def __init__(self, *args, **kwargs):
        BaseHTTPServer.HTTPServer.__init__(self, *args, **kwargs)

        # keep track of open threads, so we can close them when we exit
        self._requests = []
        self.websockets = weakref.WeakSet()

    @property
    def requests(self):
        return self._requests[:]

    def create_websocket(self, request):
        client = ClientSocket(request, '')
        self.websockets.add(client)
        return client

    def process_request_thread(self, request, client_address):
        thread = threading.current_thread()
        self._requests.append((thread, request))
        SocketServer.ThreadingMixIn.process_request_thread(
            self, request, client_address)
        self._requests.remove((thread, request))

    def handle_error(self, request, client_address):
        exc_type, exc_value, _ = sys.exc_info()
        if exc_type is socket.error and (exc_value.args[0] == errno.EPIPE or
                exc_value.args[0] == errno.EBADF):
            return  # Probably caused by a server shutdown
        else:
            print(exc_type, exc_value, dir(exc_value))
            BaseHTTPServer.HTTPServer.handle_error(
                self, request, client_address)


favicon = ('\x00\x00\x01\x00\x01\x00\x10\x10\x00\x00\x01\x00\x18\x00h\x03\x00'
           '\x00\x16\x00\x00\x00(\x00\x00\x00\x10\x00\x00\x00 \x00\x00\x00\x01'
           '\x00\x18\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
           '\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x009\x13\x115!\x0f/Z\x0f$'
           '\x81\x0e(\x9e\x10"\xbb &\xd7\x1c,\xe1\x1a9\xe2\x17a\xe3\x1au\xe4'
           '\x18\x93\xec!\xb5\xe6\x18\xcf\xe6\x18\xe7\xe8\'\xed\xdd62\x1c\x17'
           '\x185\x1e\x15W&\x18x+\x1f\x9e;\x1b\xbd@\x17\xd9F(\xe4?7\xe59X\xe99'
           'u\xe61\x8f\xe15\xaf\xd8)\xc6\xcf\x1a\xe1\xcd(\xe4\xc1;\'\x1f=\x173'
           ':\x16LG\x18oK"\x90U\x1c\xb6e\x1c\xdfy0\xe9kH\xeac`\xe0]v\xdeQ\x8a'
           '\xc89\x9b\xb3%\xb3\xb5\x1b\xca\xa8\x1f\xf5\x9c)0\x1eS#+P\x16Ed\x14'
           'br\x19\x90{\x1b\xbd\x93#\xe2\x8d7\xe3\x83K\xe3\x84e\xdbto\xc5Uq'
           '\xa7,\x8d\xa4 \xa3\x9b\x18\xc4\x92\x1a\xe1\x8c\x1e)\x13k\'$s%G\x83'
           '\x16Z\x8f(u\x9c \x9a\xa88\xca\xaaJ\xcf\x96`\xce\x8ci\xbcxm\xa7Nd'
           '\x8b)}\x81!\x8au\x19\xbbi"\xdei\x18\'\x14\x8b.\x1e\x8aA,\x89BM\x8b'
           'Dk\x98E~\x9eL\xa1\xab[\xaa\xa1^\xaf\x94`\xa6}[\x84J_j,f[\x1d\x83R'
           '\x1a\xa3L\x13\xcdJ\x18\x1d\x17\xa4? \xa3X!\x8e]/\x92XW\x97Sv'
           '\xa8^\x94\xabb\x99\xa0g\x9f\x94`\x89tSgJTQ2g@$\x7f8\x13\x9f8\x0b'
           '\xc7:\t\x13\x12\xb62\x1c\xb1d\x1a\x9a}$\x9cvK\xa2qm\xb5s\x8e\xb0m'
           '\x96\x9fw\x99\x98n}yf]YZFEr1:\x8a,\'\xaa.\x16\xde.\x10\x17\x1d'
           '\xce1\x1f\xd0^\x1c\xc1\x8b"\xae\x96@\xae\x8c[\xaf\x8d\x7f\xa8\x81'
           '\x8a\x94\x7f\x8d\x89}tqyZ]x7Qv\x1fK\x8e\x12>\xba\x1a&\xdd#\x1b'
           '\x15/\xda0-\xe0W#\xe2\x85,\xc9\x9fG\xbd\xa9g\xb9\xa4'
           '\x81\xa3\x93\x8e\x8b\x94\x93~\x8f\x80m\x95\\[\x94<T\x92%V\x9c'
           '\x0eI\xc0\x0bH\xdf\x1b9\x17D\xe1&E\xe8_>\xed\x9dN\xeb\xafb'
           '\xd5\xbc\x86\xcb\xaf\x94\xae\x99\xa4\x9a\x9d\xad\x8b\xad'
           '\x9ao\xc1{^\xbeW\\\xbeEZ\xb5\x15O\xdb\x14Q\xdd\x14e\x1a^\xdf0i'
           '\xddal\xe5\x97o\xf2\xb3\x85\xe8\xb6\x9e\xd4\xa8\xb4\xae\xa3\xbe'
           '\x96\xac\xc5\x89\xbd\xb9h\xd9\x90\\\xdfs[\xdae\\\xe0Ju\xd2 \x7f'
           '\xd4\x1b{!v\xde3}\xe7^\x8e\xdc\x80\x8c\xde\xa5\xaa\xe9\xad\xb5\xe4'
           '\xaa\xc9\xaa\xb2\xd6\x94\xbd\xdf\x81\xd7\xd1p\xdf\xabo\xdb\x8d'
           'p\xe8m{\xdeJ\x8a\xd61\x92\xce\x19\x9a\x1b\x95\xe9=\xa6\xe5W\xaa'
           '\xden\xb1\xde\x84\xc7\xe6\xa2\xca\xdc\xb2\xe0\xac\xbe\xe7\xa3\xcf'
           '\xe9\x9b\xe3\xd8\x94\xeb\xb0\x96\xe8\x97\x92\xe7}\x9a\xe7N\xa3'
           '\xd6$\xab\xcf\x11\xac\x1b\xc6\xe0&\xc9\xe9G\xd0\xeaj\xd0\xe2'
           'z\xda\xe0\x8a\xe1\xdd\xae\xe9\xcd\xc9\xeb\xc2\xe3\xe5\xc8\xf2'
           '\xd9\xdd\xe9\xbe\xcb\xeb\x9b\xbe\xe8n\xc6\xdeM\xcd\xd80\xd6\xd2'
           '\x14\xcd\x07\xe0\xdc"\xe8\xe4.\xeb\xeaJ\xea\xd8t\xe2\xd0\x85'
           '\xe7\xc9\x9a\xeb\xca\xc7\xed\xe1\xda\xe4\xeb\xec\xd3\xf5'
           '\xed\xbf\xee\xe4\x94\xed\xdcj\xe6\xd5Q\xeb\xd6>\xe5\xc5\x1b'
           '\xf0\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
           '\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
           '\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
           '\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
           '\x00\x00')


class ClientSocket(object):
    def __init__(self, socket, addr):
        self.socket = socket
        self.addr = addr
        self.buffered_data = bytearray([])
        self.remote_close = False
        self._closing = False
        self._closed = False

    def set_timeout(self, timeout):
        self.socket.settimeout(timeout)

    def set_blocking(self, flag):
        self.socket.setblocking(flag)

    def read(self):
        # as a simple server, we expect to receive:
        #    - all data at one go and one frame
        #    - one frame at a time
        #    - text protocol
        #    - no ping pong messages
        # see: http://tools.ietf.org/html/rfc6455#section-5.2

        data = self.buffered_data
        try:
            data = data + bytearray(self.socket.recv(512))
        except socket.error as e:
            if e.errno == errno.EAGAIN:  # no data available
                pass
            elif e.errno == errno.EWOULDBLOCK:  # no data available
                pass
            elif e.errno == errno.ECONNABORTED: # software disconnect
                raise SocketClosedError("Cannot read from aborted socket")
            elif e.errno == errno.EBADF:  # "Bad file desc" means socket closed
                raise SocketClosedError("Cannot read from closed socket.")
            else:
                raise
        except socket.timeout:
            return None

        if len(data) == 0:
            return None

        if(len(data) < 6):
            raise Exception("Error reading data")

        fin = (data[0] >> 7) & 0x1
        rsv = (data[0] >> 4) & 0x07
        opcode = data[0] & 0x0F
        mask = (data[1] >> 7) & 0x01
        datalen = data[1] & 0x7F

        if opcode == 8:
            if not self._closing:
                self.close()  # acknowledge the close request
                self.remote_close = True;
            self._closed = True;
            try:
                self.socket.shutdown(socket.SHUT_RDWR)
                self.socket.close()
            except socket.error:
                pass
            raise SocketClosedError("Websocket has been closed")

        offset = 0

        if datalen == 126:
            datalen = 0
            for i in range(2):
                datalen = (datalen << 8) + data[2 + i]
            offset += 2
        elif datalen == 127:
            datalen = 0
            for i in range(8):
                datalen = (datalen << 8) + data[2 + i]
            offset += 8

        if (opcode != 1 and opcode != 10) or fin != 1 or mask != 1 or rsv != 0:
            print(dict(fin=fin, rsv=rsv, opcode=opcode, mask=mask,
                       datalen=datalen))
            return None

        str_data = ''
        if datalen > 0:
            stop_index = 6 + datalen + offset
            if len(data) < stop_index:
                self.buffered_data = data
                return None
            else:
                mask_key = data[2 + offset:6 + offset]
                masked_data = data[6 + offset : stop_index]
                unmasked_data = [masked_data[i] ^ mask_key[i % 4]
                                 for i in range(len(masked_data))]
                str_data = bytearray(unmasked_data).decode('ascii')

                self.buffered_data = data[stop_index:]

        if opcode == 10:
            return None  # pong response
        else:
            return str_data

    def write(self, data, binary=False, ping=False):
        if self._closing:
            raise SocketClosedError("Connection closing or closed.")

        if binary:
            code = 0b10000010
        elif ping:
            code = 0b10001001
        else:
            code = 0b10000001
            data += '\r\n'

        N = len(data)
        if N < 126:
            header = struct.pack('!BB', code, N)
        elif N <= 0xFFFF:
            header = struct.pack('!BBH', code, 126, N)
        else:
            header = struct.pack('!BBQ', code, 127, N)

        if not binary:
            data = data.encode('ascii')
        try:
            self._sendall(header)
            self._sendall(data)
        except socket.error as e:
            if e.errno == errno.EPIPE:  # Broken pipe
                raise SocketClosedError("Cannot write to socket.")
            else:
                raise

    def close(self):
        if not self._closing:
            self._closing = True
            code = 0b10001000
            packet = struct.pack('!BB', code, 0)
            self._sendall(packet)

    def wait_for_close(self):
        if not self._closed:
            try:
                while True:
                    self.read()
                    time.sleep(0.01)
            except SocketClosedError:
                return

    def _sendall(self, data):
        bytes_sent = 0
        while bytes_sent < len(data):
            bytes_sent += self.socket.send(data[bytes_sent:])


if __name__ == '__main__':
    class Demo(SimpleWebInterface):
        # http://localhost:8080/
        def swi(self):
            return 'Hello world!'

        # http://localhost:8080/test1?a=data
        # http://localhost:8080/test1/data
        def swi_test1(self, a='value'):
            return 'The value of a is "%s"' % a

        # http://localhost:8080/test2?a=data&b=data2
        # http://localhost:8080/test2/data/data2
        # http://localhost:8080/test2?b=data2
        def swi_test2(self, a='value', b='value'):
            return 'The value of a is "%s" and b is "%s"' % (a, b)

        # http://localhost:8080/page
        def swi_page(self):
            if self.user is None:
                return self.default_login_form()
            return '''
            Hello, %s.
            <p>Click <a href="otherPage">here</a> to go to another page.
            <p>Click <a href="logout">here</a> to log out.
            ''' % self.user

        # http://localhost:8080/otherPage
        def swi_otherPage(self):
            if self.user is None:
                return self.default_login_form()
            return '''
            You are now at the other page, %s.
            <p>Click <a href="page">here</a> to go back to the first page.
            <p>Click <a href="logout">here</a> to log out.
            ''' % self.user

        # http://localhost:8080/logout
        def swi_logout(self):
            self.log_out()
            return '''
            You are now logged out.
            <p>Click <a href="page">here</a> to the first page.
            <p>Click <a href="otherPage">here</a> to go to another page.
            '''

        # http://localhost:8080/timer
        def swi_timer(self):
            return """<html><head><script>
    function doInit() {
        var s;
        try {
            s = new WebSocket("ws://localhost:8080/timer");
            s.onopen = function(e) { console.log("connected");};
            s.onclose = function(e) { console.log("connection closed");};
            s.onerror = function(e) { console.log("connection error");};
            s.onmessage = function(e) { console.log("message: " + e.data);};
        } catch(ex) {
            console.log("connection exception: " + ex);
        }
    }
    </script></head>
    <body onload="doInit();">
    </body>
    </html>"""

        def ws_timer(self, client):
            import time
            while True:
                client.write(time.strftime('%H:%M:%S'))
                time.sleep(1)

    Demo.add_user('terry', 'password')
    Demo.start(port=8080, browser=True)
