import errno
import logging
import socket
import sys
import threading
import traceback
import warnings

from .exceptions import (
    BadRequest,
    HttpError,
    InternalServerError,
    InvalidResource,
)
from .session import SessionManager
from ..compat import parse_qs, server, SimpleCookie, socketserver, urlparse

logger = logging.getLogger(__name__)


def to_response(error):
    return HtmlResponse(error.data, code=error.code, headers=error.headers)


class HttpResponse(object):
    def __init__(self, data, mimetype='text/html', code=200, headers=()):
        self.data = data
        self.mimetype = mimetype
        self.code = code
        self.headers = headers

    def send(self, request):
        request.send_response(self.code)
        request.send_header('Content-type', self.mimetype)
        if hasattr(request, 'flush_headers'):
            request.flush_headers()
        request.wfile.write(request.cookie.output().encode('utf-8'))
        request.wfile.write(b'\r\n')
        for header in self.headers:
            request.send_header(*header)
        request.end_headers()
        request.wfile.write(self.data)


class HttpRedirect(HttpResponse):
    def __init__(self, location,
                 data=b'', mimetype='text/html', code=303, headers=()):
        super(HttpRedirect, self).__init__(
            data=data, mimetype=mimetype, code=code,
            headers=headers + (('Location', location),))
        self.location = location


class HtmlResponse(HttpResponse):
    def __init__(self, body, code=200, headers=()):
        data = b'<html><body>' + body + b'</body></html>'
        super(HtmlResponse, self).__init__(data, code=code, headers=headers)


class ManagedThreadHttpServer(socketserver.ThreadingMixIn, server.HTTPServer):
    """Threaded HTTP server.

    Unlike the base server, this keeps track of its connections
    to allow a proper shutdown.
    """

    daemon_threads = True  # this ensures all spawned threads exit

    def __init__(self, *args, **kwargs):
        server.HTTPServer.__init__(self, *args, **kwargs)

        self.sessions = SessionManager()
        # keep track of open threads, so we can close them when we exit
        self._requests = []

        self._shutting_down = False

    @property
    def requests(self):
        return self._requests[:]

    def process_request_thread(self, request, client_address):
        thread = threading.current_thread()
        self._requests.append((thread, request))
        socketserver.ThreadingMixIn.process_request_thread(
            self, request, client_address)
        self._requests.remove((thread, request))

    def handle_error(self, request, client_address):
        exc_type, exc_value, _ = sys.exc_info()
        if (exc_type is socket.error and
                exc_value.args[0] in
                [errno.EPIPE, errno.EBADF, errno.ECONNRESET]):
            return  # Probably caused by a server shutdown
        else:
            logger.exception("Server error.")
            server.HTTPServer.handle_error(self, request, client_address)

    def _shutdown(self):
        for _, request in self.requests:
            self.shutdown_request(request)
        server.HTTPServer.shutdown(self)

    def shutdown(self):
        if self._shutting_down:
            return
        self._shutting_down = True
        self._shutdown()

    def wait_for_shutdown(self, timeout=None):
        """Wait for all request threads to finish.

        Parameters
        ----------
        timeout : float, optional
            Maximum time in seconds to wait for each thread to finish.
        """
        for thread, _ in self.requests:
            if thread.is_alive():
                thread.join(timeout)


class HttpRequestHandler(server.BaseHTTPRequestHandler):

    _http_routes = {}

    def __init__(self, *args, **kwargs):
        self.route = None
        self.query = None
        self.db = {}
        self.cookie = SimpleCookie()
        server.BaseHTTPRequestHandler.__init__(self, *args, **kwargs)

    def do_POST(self):
        data = self.rfile.read(
            int(self.headers['Content-Length'])).decode('ascii')

        if 'multipart/form-data' in self.headers['Content-Type']:
            raise NotImplementedError()  # TODO
        else:
            self.db = {k: v[0] for k, v in parse_qs(data).items()}

        self.do_GET()

    def do_GET(self):
        parsed = urlparse(self.path)
        self.route = parsed.path
        self.query = parse_qs(parsed.query)
        self.db.update(
            {k: v[0] for k, v in self.query.items() if k not in self.db})
        if 'Cookie' in self.headers:
            self.cookie.load(self.headers['Cookie'])

        try:
            connection = self.headers.get('Connection', 'close').lower()
            if 'upgrade' in connection:
                self.handle_upgrade()
            else:
                self.http_GET()
        except HttpError as err:
            logger.warning(
                'Error response (%i): %s', err.code, err.msg, exc_info=True)
            to_response(err).send(self)
        except Exception as err:
            logger.exception('Error response')
            err = InternalServerError(
                '<pre>' + traceback.format_exc() + '</pre>')
            to_response(err).send(self)

    def http_GET(self):
        endpoint = self._get_endpoint(self._http_routes, self.route)
        if endpoint is None:
            raise InvalidResource(self.path)
        response = endpoint(self)  # TODO: pass in appropriate stuff
        response.send(self)

    def handle_upgrade(self):
        raise BadRequest()

    def get_expected_origins(self):
        raise NotImplementedError()

    @classmethod
    def _get_endpoint(cls, routes, route):
        if not route.startswith('/'):
            route = '/' + route

        while len(route) > 0:
            if route in routes:
                return routes[route]
            route = route.rsplit('/', 1)[0]
        if '/' in routes:
            return routes['/']
        return None

    @classmethod
    def http_route(cls, route):
        def _http_route(endpoint):
            if route in cls._http_routes:
                warnings.warn("HTTP route %r was overwritten" % (route,))
            cls._http_routes[route] = endpoint
            return endpoint
        return _http_route
