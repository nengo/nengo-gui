import time

from nengo_gui.threads import ControlledThread, RepeatedThread


class Counter(object):

    def __init__(self):
        self.count = 0

    def __call__(self):
        self.count += 1


class TestControlledThread(object):
    def test_playpause(self):
        thread = ControlledThread(Counter())
        thread.pause()
        thread.start()
        assert thread.function.count == 0
        thread.play()
        time.sleep(0.01)
        thread.pause()
        time.sleep(0.01)
        count = thread.function.count
        assert count > 0
        time.sleep(0.01)
        assert count == thread.function.count
        thread.stop()


class TestRepeatedThread(object):
    def test_playpause(self):
        # 50 ms interval
        thread = RepeatedThread(0.05, Counter())
        thread.pause()
        thread.start()
        assert thread.function.count == 0
        thread.play()
        time.sleep(0.26)
        thread.pause()
        time.sleep(0.01)
        count = thread.function.count
        assert 4 <= count <= 6  # Should be 5, but sleep might be off
        assert count == thread.function.count
        thread.stop()
