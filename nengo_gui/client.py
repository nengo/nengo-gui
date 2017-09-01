from collections import defaultdict
import inspect
import json
import warnings
import weakref

from nengo.utils.compat import with_metaclass


def bind(name):
    def _bind(method):
        method.__route__ = name
        return method
    return _bind


class ClientConnection(object):
    def __init__(self, ws):
        self.ws = ws
        self.callbacks = defaultdict(set)

    @staticmethod
    def _element(callback):
        if inspect.ismethod(callback):
            return weakref.ref(callback.__self__), callback.__func__.__name__
        else:
            return weakref.ref(callback), None

    def _prune(self, name):
        if len(self.callbacks[name]) == 0:
            del self.callbacks[name]

    def bind(self, name, callback):
        """Define a function name that the client can call."""
        self.callbacks[name].add(self._element(callback))

    def is_bound(self, name):
        return name in self.callbacks

    def dispatch(self, name, **kwargs):
        """Call a function bound to this page."""
        # Iterate over a copy so we can remove stale elements
        for ref, meth in self.callbacks[name].copy():
            if meth is None:
                cb = ref()
            else:
                cb = getattr(ref(), meth, None)

            if cb is None:
                self.callbacks[name].remove((ref, meth))
            else:
                cb(**kwargs)

        # Do this check after iterating in case size changes during iteration
        self._prune(name)
        if not self.is_bound(name):
            warnings.warn("Nothing bound for %r" % (name,))

    def send(self, name, **kwargs):
        """Send a message to the client."""
        assert self.ws is not None
        self.ws.write_text(json.dumps([name, kwargs]))

    def unbind(self, name, callback):
        el = self._element(callback)
        if el in self.callbacks[name]:
            self.callbacks[name].remove(el)
        self._prune(name)


class Bindable(type):
    """A metaclass used to bind methods exposed to the client."""

    def __call__(cls, *args, **kwargs):
        """Override default __call__ behavior so that methods get bound."""
        inst = type.__call__(cls, *args, **kwargs)
        assert isinstance(inst.client, ClientConnection)
        bindable = lambda f: inspect.ismethod(f) and hasattr(f, "__route__")
        for _, method in inspect.getmembers(inst, predicate=bindable):
            inst.client.bind(method.__route__.format(self=inst), method)
        return inst


class ExposedToClient(with_metaclass(Bindable)):
    def __init__(self, client):
        self.client = client
