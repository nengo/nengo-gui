from __future__ import absolute_import

import sys

# Only test for Python 2 so that we have less changes for Python 4
PY2 = sys.version_info[0] == 2

if PY2:
    import BaseHTTPServer as server
    from Cookie import SimpleCookie
    import SocketServer as socketserver
    from urlparse import parse_qs, unquote, urlparse
else:
    from http import server
    from http.cookies import SimpleCookie
    import socketserver
    from urllib.parse import parse_qs, unquote, urlparse

assert parse_qs
assert server
assert SimpleCookie
assert socketserver
assert unquote
assert urlparse
