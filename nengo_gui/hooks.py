import weakref

class Hook(object):
    def __init__(self):
        self.callbacks = weakref.WeakKeyDictionary()
    def trigger(self, model, sim):
        items = self.callbacks.get(model, [])
        for callback in items:
            callback(sim)
    def __call__(self, model):
        def register(fn, model=model, callbacks=self.callbacks):
            if model not in callbacks:
                callbacks[model] = [fn]
            else:
                callbacks[model].append(fn)
        return register

on_step = Hook()
on_start = Hook()
on_pause = Hook()
on_continue = Hook()
on_close = Hook()
