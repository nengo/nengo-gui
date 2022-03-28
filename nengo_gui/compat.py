from __future__ import absolute_import

import collections.abc
import sys

import numpy as np

# Only test for Python 2 so that we have less changes for Python 4
PY2 = sys.version_info[0] == 2

# If something's changed from Python 2 to 3, we handle that here
if PY2:
    from cgi import escape as cgi_escape

    from StringIO import StringIO

    escape = lambda s, quote=True: cgi_escape(s, quote=quote)
    iteritems = lambda d: d.iteritems()

    string_types = (str, unicode)
    int_types = (int, long)
    range = xrange

else:
    from html import escape
    from io import StringIO

    iteritems = lambda d: iter(d.items())


def is_iterable(obj):
    if isinstance(obj, np.ndarray):
        return obj.ndim > 0  # 0-d arrays give error if iterated over
    else:
        return isinstance(obj, collections.abc.Iterable)
