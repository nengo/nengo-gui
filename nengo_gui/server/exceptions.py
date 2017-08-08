class SocketClosedError(IOError):
    pass


class HttpError(Exception):
    def __init__(self, code, msg, headers=(), data=None):
        super(HttpError, self).__init__(msg)
        self.code = code
        self.msg = msg
        self.headers = headers
        if data is None:
            data = b'<h1>' + bytes(self.code) + b'</h1><p>' + msg.encode(
                'utf-8') + b'</p>'
        self.data = data


class BadRequest(HttpError):
    def __init__(self):
        super(BadRequest, self).__init__(400, 'Bad request')


class Forbidden(HttpError):
    def __init__(self):
        super(Forbidden, self).__init__(403, 'Forbidden')


class InvalidResource(HttpError):
    def __init__(self, path):
        super(InvalidResource, self).__init__(404, 'Invalid resource: ' + path)


class UpgradeRequired(HttpError):
    def __init__(self, headers):
        super(UpgradeRequired, self).__init__(426, 'Upgrade required', headers)


class InternalServerError(HttpError):
    def __init__(self, msg):
        super(InternalServerError, self).__init__(
            500, 'Internal server error', data=msg.encode('utf-8'))


class SessionExpiredError(Exception):
    pass


class ServerShutdown(Exception):
    """Causes the server to shutdown when raised."""
