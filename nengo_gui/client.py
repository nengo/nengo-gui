from collections import defaultdict
from functools import partial
import inspect
import json
import warnings
import weakref

import numpy as np
from nengo.utils.compat import is_array, with_metaclass


def bind(name):
    def _bind(method):
        if isinstance(method, property):
            raise RuntimeError("Bind to the method, not the property")

        if isinstance(method, staticmethod):
            method.__func__.__route__ = name
            return method.__func__
        elif isinstance(method, classmethod):
            method.__func__.__route__ = name
            return method
        else:
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
        elif isinstance(callback, partial):
            return weakref.ref(callback.args[0]), callback
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
        retval = None
        for ref, meth in self.callbacks[name].copy():
            if meth is None:
                cb = ref()
            elif isinstance(meth, partial):
                cb = meth if ref() is not None else None
            else:
                cb = getattr(ref(), meth, None)

            if cb is None:
                self.callbacks[name].remove((ref, meth))
            else:
                retval = cb(**kwargs)

        # Do this check after iterating in case size changes during iteration
        self._prune(name)
        if not self.is_bound(name):
            warnings.warn("Nothing bound for %r" % (name,))

        # We return the value of the last call
        return retval

    def send(self, name, **kwargs):
        """Send a message to the client."""
        assert self.ws is not None
        self.ws.write_text(json.dumps([name, kwargs]))

    def unbind(self, name, callback=None):
        if callback is None:
            del self.callbacks[name]
        else:
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

        # Bind methods and static functions
        def bindable(f):
            if inspect.ismethod(f) or inspect.isfunction(f):
                return (hasattr(f, "__route__") or
                        (hasattr(f, "__func__")
                         and hasattr(f.__func__, "__route__")))

        for _, method in inspect.getmembers(inst, predicate=bindable):
            inst.client.bind(method.__route__.format(self=inst), method)

        # Bind properties
        is_prop = lambda f: isinstance(f, property)
        for _, prop in inspect.getmembers(type(inst), predicate=is_prop):

            # Check if the get, set, or del are bound
            for attr in ("fget", "fset", "fdel"):
                f = getattr(prop, attr)
                if hasattr(f, "__route__"):
                    # If so, we manually bind the instance to the function
                    # with partial, which makes it act like an instance method
                    inst.client.bind(f.__route__.format(self=inst),
                                     partial(f, inst))

        return inst


class ExposedToClient(with_metaclass(Bindable)):
    def __init__(self, client):
        self.client = client


class FastClientConnection(object):
    def __init__(self, ws):
        self.ws = ws
        self.callback = None
        self.dtype = None

    def bind(self, callback, dtype=np.float64):
        self.callback = callback
        self.dtype = None

    def receive(self, data):
        if self.callback is not None:
            self.callback(np.frombuffer(data, dtype=self.dtype))

    def send(self, data):
        assert is_array(data)
        self.ws.write_binary(data.tobytes())
