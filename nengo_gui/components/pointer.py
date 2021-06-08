import copy
import itertools

import nengo
import nengo.spa as spa

try:
    import nengo_spa
    from nengo_spa.examine import pairs
except ImportError:
    nengo_spa = None
import numpy as np
from nengo_gui.components.component import Component
from nengo_gui.components.spa_plot import SpaPlot


class Pointer(SpaPlot):
    """Server side component for the Semantic Pointer Cloud"""

    config_defaults = dict(
        show_pairs=False, max_size=1000.0, **Component.config_defaults
    )

    def __init__(self, obj, **kwargs):
        super(Pointer, self).__init__(obj, **kwargs)

        # the semantic pointer value as set by the user in the GUI
        # a value of 'None' means do not override
        self.override_target = None

        # The white list indicates the networks whose user-defined
        # over-ride value can be inserted on the input
        # thus the value loops in from the output to the input.
        # All other networks have their value inserted on the output.
        # Looping-in has the advantage of actually changing the
        # neural activity of the population, rather than just changing
        # the output.
        self.loop_in_whitelist = [spa.Buffer, spa.Memory, spa.State]
        if nengo_spa is not None:
            self.loop_in_whitelist.extend([nengo_spa.State])

        self.node = None
        self.conn1 = None
        self.conn2 = None

    def add_nengo_objects(self, page):
        with page.model:
            if self.target.startswith("<"):
                output = getattr(self.obj, self.target[1:-1])
            else:
                output = self.obj.outputs[self.target][0]
            self.node = nengo.Node(
                self.gather_data,
                size_in=self.vocab_out.dimensions,
                size_out=self.vocab_out.dimensions,
            )
            self.conn1 = nengo.Connection(output, self.node, synapse=0.01)
            loop_in = type(self.obj) in self.loop_in_whitelist
            if loop_in and self.target == "default":
                input = self.obj.inputs[self.target][0]
                self.conn2 = nengo.Connection(self.node, input, synapse=0.01)
            elif output.size_in > 0:
                self.conn2 = nengo.Connection(self.node, output, synapse=0.01)
            else:
                self.conn2 = None

    def remove_nengo_objects(self, page):
        page.model.connections.remove(self.conn1)
        if self.conn2 is not None:
            page.model.connections.remove(self.conn2)
        page.model.nodes.remove(self.node)

    def gather_data(self, t, x):
        vocab = self.vocab_out
        key_similarities = np.dot(vocab.vectors, x)
        over_threshold = key_similarities > 0.01
        if isinstance(vocab, spa.Vocabulary):
            matches = zip(
                key_similarities[over_threshold], np.array(vocab.keys)[over_threshold]
            )
            if self.config.show_pairs:
                self.vocab_out.include_pairs = True
                pair_similarities = np.dot(vocab.vector_pairs, x)
                over_threshold = pair_similarities > 0.01
                pair_matches = zip(
                    pair_similarities[over_threshold],
                    np.array(vocab.key_pairs)[over_threshold],
                )
                matches = itertools.chain(matches, pair_matches)
        else:
            matches = zip(
                key_similarities[over_threshold],
                [k for i, k in enumerate(vocab) if over_threshold[i]],
            )
            if self.config.show_pairs:
                pair_similarities = np.array(
                    [np.dot(vocab.parse(p).v, x) for p in pairs(vocab)]
                )
                over_threshold = pair_similarities > 0.01
                pair_matches = zip(
                    pair_similarities[over_threshold],
                    (k for i, k in enumerate(pairs(vocab)) if over_threshold[i]),
                )
                matches = itertools.chain(matches, pair_matches)

        text = ";".join(["%0.2f%s" % (min(sim, 9.99), key) for sim, key in matches])

        # msg sent as a string due to variable size of pointer names
        msg = "%g %s" % (t, text)
        self.data.append(msg)
        if self.override_target is None:
            return np.zeros(self.vocab_out.dimensions)
        else:
            v = (self.override_target.v - x) * 3
            return v

    def update_client(self, client):
        while len(self.data) > 0:
            data = self.data.popleft()
            client.write_text(data)

    def javascript(self):
        info = dict(uid=id(self), label=self.label)
        json = self.javascript_config(info)
        return "new Nengo.Pointer(main, sim, %s);" % json

    def message(self, msg):
        if msg == ":empty:":
            self.override_target = None
        elif msg[0:12] == ":check only:":
            if len(msg) == 12:
                self.data.append("good_pointer")
            else:
                vocab = copy.deepcopy(self.vocab_out)
                try:
                    vocab.parse(msg[12:])
                    self.data.append("good_pointer")
                except:
                    self.data.append("bad_pointer")
        else:
            # The message value is the new value for the output of the pointer
            try:
                self.override_target = self.vocab_out.parse(msg)
            except:
                self.override_target = None
