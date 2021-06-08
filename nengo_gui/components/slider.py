import collections
import struct

import numpy as np

try:
    from nengo.processes import Process
except ImportError:

    class Process(object):
        pass


from nengo_gui.compat import is_iterable
from nengo_gui.components.component import Component


class OverriddenOutput(Process):
    def __init__(self, base_output, to_client=None, from_client=None):
        super(OverriddenOutput, self).__init__()
        self.base_output = base_output
        self.to_client = to_client
        self.from_client = from_client

    def make_step(self, shape_in, shape_out, dt, rng, state=None):
        size_out = shape_out[0] if is_iterable(shape_out) else shape_out

        if self.base_output is None:
            f = self.passthrough
        elif isinstance(self.base_output, Process):
            try:
                state = self.base_output.make_state(shape_in, shape_out, dt, rng)
                f = self.base_output.make_step(
                    shape_in, shape_out, dt, rng, state=state
                )
            except AttributeError:
                # for nengo<=2.8.0
                f = self.base_output.make_step(shape_in, shape_out, dt, rng)
        else:
            f = self.base_output
        return self.Step(
            size_out, f, to_client=self.to_client, from_client=self.from_client
        )

    @staticmethod
    def passthrough(t, x):
        return x

    class Step(object):
        def __init__(self, size_out, f, to_client=None, from_client=None):
            self.size_out = size_out
            self.f = f
            self.to_client = to_client
            self.from_client = from_client

            self.last_time = None
            self.struct = struct.Struct("<%df" % (1 + self.size_out))
            self.value = np.zeros(size_out, dtype=np.float64)

        def __call__(self, t, *args):
            # Stop overriding if we've reset
            if self.last_time is None or t < self.last_time:
                self.from_client[:] = np.nan
            self.last_time = t

            val_idx = np.isnan(self.from_client)

            if callable(self.f):
                self.value[:] = np.atleast_1d(self.f(t, *args))
                if self.to_client is not None:
                    self.to_client.append(self.struct.pack(t, *self.value))
            else:
                self.value[:] = self.f

            # Override values from the client
            self.value[~val_idx] = self.from_client[~val_idx]
            return self.value


class Slider(Component):
    """Input control component. Exclusively associated to Nodes"""

    config_defaults = dict(max_value=1, min_value=-1, **Component.config_defaults)

    def __init__(self, node):
        super(Slider, self).__init__()
        self.node = node
        self.base_output = node.output

        self.to_client = collections.deque()
        self.from_client = np.zeros(node.size_out, dtype=np.float64) * np.nan
        self.override_output = OverriddenOutput(
            self.base_output, self.to_client, self.from_client
        )
        self.start_value = np.zeros(node.size_out, dtype=np.float64)
        if not (
            self.base_output is None
            or callable(self.base_output)
            or isinstance(self.base_output, Process)
        ):
            self.start_value[:] = self.base_output

    def attach(self, page, config, uid):
        super(Slider, self).attach(page, config, uid)
        self.label = page.get_label(self.node)

    def add_nengo_objects(self, page):
        if Process.__module__ == "nengo_gui.components.slider":
            self.node.output = self.override_output.make_step(
                shape_in=None, shape_out=self.node.size_out, dt=None, rng=None
            )
        elif page.settings.backend == "nengo_spinnaker":
            # TODO: this should happen for any backend that does not support
            #  Processes
            self.node.output = self.override_output.make_step(
                shape_in=None, shape_out=self.node.size_out, dt=None, rng=None
            )
        else:
            self.node.output = self.override_output

    def remove_nengo_objects(self, page):
        self.node.output = self.base_output

    def javascript(self):
        info = dict(
            uid=id(self),
            n_sliders=self.node.size_out,
            label=self.label,
            start_value=[float(x) for x in self.start_value],
        )
        json = self.javascript_config(info)
        return "new Nengo.Slider(main, sim, %s);" % json

    def update_client(self, client):
        while len(self.to_client) > 0:
            to_client = self.to_client.popleft()
            client.write_binary(to_client)

    def message(self, msg):
        index, value = msg.split(",")
        index = int(index)
        if value == "reset":
            self.from_client[index] = np.nan
        else:
            self.from_client[index] = float(value)

    def code_python_args(self, uids):
        return [uids[self.node]]
