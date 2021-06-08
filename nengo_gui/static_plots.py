import nengo
import numpy as np
from nengo.utils.ensemble import response_curves, tuning_curves


class PlotInfo(object):
    def __init__(self, title, plot="none"):
        self.title = title
        self.plot = plot
        self.warnings = []
        self.x = None
        self.y = None
        self.x_label = None
        self.y_label = None

    def to_dict(self):
        x, y = self.x, self.y
        if self.plot == "multiline":
            assert self.x.shape[0] == self.y.shape[1]
            x = self.x.tolist()
            y = [yy.tolist() for yy in self.y]
        return {
            "plot": self.plot,
            "title": self.title,
            "warnings": self.warnings,
            "x": x,
            "y": y,
            "x_label": self.x_label if self.x_label != None else "",
            "y_label": self.y_label if self.y_label != None else "",
        }


def response_curve_plot(ens, sim):
    rc = PlotInfo("Response curves", plot="multiline")
    rc.x, rc.y = response_curves(ens, sim)
    rc.x_label = "Input current"
    rc.y = rc.y.T
    rc.y_label = "Firing rate (Hz)"

    if len(rc.y.shape) == 1:
        rc.y.shape = 1, rc.y.shape[0]
    if ens.n_neurons > 200:
        rc.warnings.append("Only showing the first 200 neurons.")
        rc.y = rc.y[:200]
    return rc.to_dict()


def tuning_curve_plot(ens, sim):
    tc = PlotInfo("Tuning curves")

    if ens.dimensions == 1:
        tc.plot = "multiline"
        tc.x, tc.y = tuning_curves(ens, sim)
        tc.x_label = "x"
        tc.y = tc.y.T
        tc.y_label = "Firing rate (Hz)"

        if ens.n_neurons > 200:
            tc.warnings.append("Only showing the first 200 neurons.")
            tc.y = tc.y[:200]
    else:
        tc.warnings.append("Tuning curves only shown for " "one-dimensional ensembles.")
    return tc.to_dict()


def node_output_plot(node):
    f_out = PlotInfo("Node output")
    if node.size_in > 0:
        f_out.warnings.append("Node output only shown when 'size_in' is 0.")
    else:
        f_out.plot = "multiline"
        if callable(node.output):
            dt = 0.001
            f_out.x = np.arange(dt, 1.0, dt)
            f_out.y = np.asarray([node.output(x) for x in f_out.x])
        else:
            # Don't bother with all the copies if it's static
            f_out.x = np.asarray([0, 1.0])
            f_out.y = np.hstack((node.output, node.output))
        if f_out.y.ndim == 1:
            f_out.y = f_out.y[:, np.newaxis]
        f_out.y = f_out.y.T
    return f_out.to_dict()
