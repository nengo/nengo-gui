import numpy as np

try:
    from nengo.processes import Process
except ImportError:

    class Process(object):
        pass

from nengo.utils.compat import is_iterable

from ..client import bind
from .base import Widget


class OverriddenOutput(Process):
    def __init__(self, base_output, fast_client):
        super(OverriddenOutput, self).__init__()
        self.base_output = base_output
        self.fast_client = fast_client

    def make_step(self, shape_in, shape_out, dt, rng):
        size_out = shape_out[0] if is_iterable(shape_out) else shape_out

        if self.base_output is None:
            f = self.passthrough
        elif isinstance(self.base_output, Process):
            f = self.base_output.make_step(shape_in, shape_out, dt, rng)
        else:
            f = self.base_output
        return self.Step(size_out, f, self.fast_client)

    @staticmethod
    def passthrough(t, x):
        return x

    class Step(object):
        def __init__(self, size_out, f, fast_client):
            self.size_out = size_out
            self.f = f
            self.fast_client = fast_client
            self.from_client = np.zeros(size_out, dtype=np.float64) * np.nan

            def set_from_client(data):
                self.from_client[...] = data
            self.fast_client.bind(set_from_client)

            self.value = np.zeros(size_out, dtype=np.float64) * np.nan
            self.t = 0.0

        def __call__(self, t, *args):
            # Stop overriding if we've reset
            if t < self.t:
                self.from_client[...] = np.nan
            self.t = t

            if callable(self.f):
                self.value[...] = np.atleast_1d(self.f(t, *args))
                # TODO: is this only needed when callable?
                self.fast_client.send(self.value)
            else:
                self.value[...] = self.f

            # Override values from the client
            val_idx = np.isnan(self.from_client)
            self.value[~val_idx] = self.from_client[~val_idx]
            return self.value


class Slider(Widget):
    """Input control component. Exclusively associated to Nodes"""

    def __init__(self, client, obj, uid, ylim=(-1, 1), pos=None, label=None):
        super(Slider, self).__init__(client, obj, uid, pos, label)
        self.base_output = self.obj.obj.output

    def add_nengo_objects(self, model):
        backend = self.client.dispatch("simcontrol.get_backend")
        dt = self.client.dispatch("simcontrol.get_dt")
        supports_process = (Process.__module__ != "nengo_gui.components.slider"
                            and backend != "nengo_spinnaker")
        override_output = OverriddenOutput(self.base_output, self.fast_client)

        # If we're using a version of Nengo without Process support,
        # or a backend without Process support...
        if not supports_process or backend == 'nengo_spinnaker':
            self.obj.obj.output = override_output.make_step(
                shape_in=(self.obj.obj.size_in,),
                shape_out=(self.obj.obj.size_out,),
                dt=dt,
                rng=np.random)
        else:
            self.obj.obj.output = override_output

    def create(self):
        start_value = np.zeros(self.obj.obj.size_out, dtype=np.float64)
        if not (self.base_output is None or
                callable(self.base_output) or
                isinstance(self.base_output, Process)):
            start_value[...] = self.base_output
        start_value = [float(x) for x in start_value]
        self.client.send("netgraph.create_slider",
                         uid=self.uid, n_sliders=self.obj.obj.size_out,
                         label=self.label, start_value=start_value)

    def remove_nengo_objects(self, model):
        # If we're setting the output back to None, clear size_out
        # to avoid a warning when size_out is automatically set
        if self.base_output is None:
            self.obj.obj.size_out = None
        self.obj.obj.output = self.base_output

    @bind("{self.uid}.reset")
    def reset(self):
        # Make sure we're currently running
        if self.obj.obj.output is not self.base_output:
            # A bit of a hack, but to reset we set all of the values to nan
            # as nan values are not overridden.
            nans = np.zeros(self.obj.obj.size_out) * np.nan
            # Send directly to the fast client
            self.fast_client.receive(nans.tobytes())
