import collections

from nengo.spa.module import Module

from nengo_gui.components.component import Component


class SpaPlot(Component):
    """Parent class for pointer.Pointer and spa_similarity.SpaSimilarity"""

    def __init__(self, obj, **kwargs):
        super(SpaPlot, self).__init__()
        self.obj = obj
        self.data = collections.deque()
        self.target = kwargs.get('args', 'default')
        self.vocab_out = obj.outputs[self.target][1]

    @property
    def label(self):
        return self.page.names.label(self.obj)

    @Component.config.setter
    def config(self, val):
        self._config = val
        self.vocab_out.include_pairs = val.show_pairs

    def update_client(self, client):
        while len(self.data) > 0:
            data = self.data.popleft()
            client.write_text(data)

    def code_python_args(self, uids):
        return [uids[self.obj], 'target=%r' % self.target]

    @staticmethod
    def applicable_targets(obj):
        targets = []
        if isinstance(obj, Module):
            for target_name, (obj, vocab) in obj.outputs.items():
                if vocab is not None:
                    targets.append(target_name)
        return targets
