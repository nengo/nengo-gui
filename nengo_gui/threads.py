from __future__ import absolute_import

import threading


class ControlledThread(threading.Thread):
    """Calls function(*args, **kwargs) as fast as possible.

    Can be temporarily stopped with the `.pause` method, and restarted with
    `.play`. The `.stop` method will stop the thread permanently.
    """

    def __init__(self, function, *args, **kwargs):
        super(ControlledThread, self).__init__()
        self._playing = threading.Event()
        self._stopped = threading.Event()
        self.daemon = True

        self.function = function
        self.args = args
        self.kwargs = kwargs

    def pause(self):
        self._playing.clear()

    def play(self):
        self._playing.set()

    def run(self):
        while not self._stopped.is_set():
            self._playing.wait()
            self.function(*self.args, **self.kwargs)

    def stop(self):
        self._playing.set()  # Without this while loop won't continue
        self._stopped.set()
        self.join()


class RepeatedThread(ControlledThread):
    """Calls function(*args, **kwargs) every ``interval`` seconds.

    Can be temporarily stopped with the `.pause` method, and restarted with
    `.play`. The `.stop` method will stop the thread permanently.
    """

    def __init__(self, interval, function, *args, **kwargs):
        super(RepeatedThread, self).__init__(function, *args, **kwargs)
        self.interval = interval
        self._waiting = threading.Event()

    def run(self):
        while not self._stopped.is_set():
            self._waiting.wait(self.interval)
            self._playing.wait()
            self.function(*self.args, **self.kwargs)
