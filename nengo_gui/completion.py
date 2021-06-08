import threading
import warnings

try:
    from jedi.api import Script
except ImportError:
    warnings.warn("Install the jedi module to get autocompletion in Nengo GUI.")

    class Script(object):
        def __init__(self, *args, **kwargs):
            pass

        def completions(self):
            return []


_jedi_lock = threading.Lock()


def get_completions(code, line, column, path=None):
    with _jedi_lock:
        script = Script(code, line, column, path=path)
        return script.completions()
