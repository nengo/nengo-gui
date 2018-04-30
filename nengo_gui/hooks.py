from collections import defaultdict


class Context(object):
    context_stack = [None]

    def __init__(self, page):
        self.page = page

    def __enter__(self):
        self.context_stack.append(self.page)
        for hook in (on_step, on_start, on_pause, on_continue, on_close):
            # NOTE entering context clears hooks, this might be surprising and
            # there might be a better solution to prevent accumulation of hooks
            # from multiple code executions.
            if self.page in hook.callbacks:
                del hook.callbacks[self.page]
        return self

    def __exit__(self, exc_type, exc_value, tb):
        assert self.context_stack.pop() is self.page


class Hook(object):
    def __init__(self):
        self.callbacks = defaultdict(list)  # FIXME page references should be weak

    def __call__(self, fn):
        self.callbacks[Context.context_stack[-1]].append(fn)

    def execute(self, page):
        for cb in self.callbacks[page] + self.callbacks[None]:
            cb(page.sim)


on_step = Hook()
on_start = Hook()
on_pause = Hook()
on_continue = Hook()
on_close = Hook()
