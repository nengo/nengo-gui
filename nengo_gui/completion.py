import warnings

try:
    from jedi.api import Script
except ImportError:
    warnings.warn(
        "Install the jedi module to get autocompletion in Nengo GUI.")

    class Script(object):
        def __init__(self, *args, **kwargs):
            pass

        def completions(self):
            return []


def get_completions(code, line, column, path=None):
    script = Script(code, line, column, path=path)
    return script.completions()
