try:
    from urllib.parse import quote, urlencode
except ImportError:
    from urllib import quote, urlencode


class Resource(object):
    __slots__ = ["path", "query"]

    def __init__(self, path=None, query=None):
        self.path = path
        self.query = query

    def __str__(self):
        url = []
        if self.path is not None:
            url.append(quote(self.path))
        if self.query is not None:
            url.extend(("?", urlencode(self.query)))
        return "".join(url)


class URL(object):
    __slots__ = ["protocol", "host", "port", "resource"]

    def __init__(self, host, port, protocol="http", resource=None):
        self.host = host
        self.port = port
        self.protocol = protocol
        self.resource = resource

    def __str__(self):
        url = []
        if self.protocol is not None:
            url.append(self.protocol)
        url.extend(("://", self.host, ":", str(self.port)))
        if self.resource is not None:
            url.append(str(self.resource))
        return "".join(url)
