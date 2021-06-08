import collections

import nengo.spa as spa

try:
    import nengo_spa
except ImportError:
    nengo_spa = None

from nengo_gui.components.component import Component


class SpaPlot(Component):
    """Parent class for pointer.Pointer and spa_similarity.SpaSimilarity"""

    def __init__(self, obj, **kwargs):
        super(SpaPlot, self).__init__()
        self.obj = obj
        self.data = collections.deque()
        self.target = kwargs.get("args", "default")
        if self.target.startswith("<"):
            target_obj = getattr(obj, self.target[1:-1])
            self.vocab_out = obj.get_output_vocab(target_obj)
        else:
            self.vocab_out = obj.outputs[self.target][1]

    def attach(self, page, config, uid):
        super(SpaPlot, self).attach(page, config, uid)
        self.label = page.get_label(self.obj)
        self.vocab_out.include_pairs = config.show_pairs

    def update_client(self, client):
        while len(self.data) > 0:
            data = self.data.popleft()
            client.write_text(data)

    def code_python_args(self, uids):
        return [uids[self.obj], "args=%r" % self.target]

    @staticmethod
    def applicable_targets(obj):
        targets = []
        if isinstance(obj, spa.module.Module) or (
            nengo_spa is not None and isinstance(obj, nengo_spa.Network)
        ):

            if hasattr(obj, "outputs"):
                for target_name, (obj, vocab) in obj.outputs.items():
                    if vocab is not None:
                        targets.append(target_name)
            elif hasattr(obj, "output"):
                # TODO: check for other outputs than obj.output
                try:
                    v = obj.get_output_vocab(obj.output)
                    if v is not None:
                        targets.append("<output>")
                except KeyError:
                    # Module has no output vocab
                    pass

        return targets
