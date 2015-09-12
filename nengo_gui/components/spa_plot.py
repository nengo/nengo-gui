import collections

from nengo_gui.components.component import Component

class SpaPlot(Component):
    """Parent class for pointer.py and
    spa_similarity.py"""

    def __init__(self, obj, **kwargs):
        super(SpaPlot, self).__init__()
        self.obj = obj
        self.data = collections.deque()
        self.target = kwargs.get('args', 'default')
        self.vocab_out = obj.outputs[self.target][1]

    def attach(self, page, config, uid):
        super(SpaPlot, self).attach(page, config, uid)
        self.label = page.get_label(self.obj)
        self.vocab_out.include_pairs = config.show_pairs

    def update_client(self, client):
        while len(self.data) > 0:
            data = self.data.popleft()
            client.write(data, binary=False)

    def code_python_args(self, uids):
        return [uids[self.obj], 'target=%r' % self.target]