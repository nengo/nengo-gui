"""One-off functions that create Javascript calls"""

import json

import numpy as np

import nengo
from nengo.utils.ensemble import response_curves, tuning_curves


def infomodal(ng, uid, **args):
    obj = ng.uids[uid]
    if isinstance(obj, nengo.Ensemble):
        return ensemble_infomodal(ng, uid=uid, **args)
    elif isinstance(obj, nengo.Node):
        return node_infomodal(ng, uid=uid, **args)
    elif isinstance(obj, nengo.Network):
        return net_infomodal(ng, uid=uid, **args)
    else:
        raise NotImplementedError()


class PlotInfo(object):
    def __init__(self, title, plot="none"):
        self.title = title
        self.plot = plot
        self.warnings = []
        self.x = None
        self.y = None

    def to_dict(self):
        x, y = self.x, self.y
        if self.plot == "multiline":
            assert self.x.shape[0] == self.y.shape[1]
            x = self.x.tolist()
            y = [yy.tolist() for yy in self.y]
        return {
            'plot': self.plot,
            'title': self.title,
            'warnings': self.warnings,
            'x': x,
            'y': y,
        }

def ensemble_infomodal(viz, ens, uid):
    params = [(attr, str(getattr(ens, attr))) for attr in (
        'n_neurons', 'dimensions', 'radius', 'encoders', 'intercepts',
        'max_rates', 'eval_points', 'n_eval_points', 'neuron_type',
        'noise', 'seed') if getattr(ens, attr) is not None]

    if viz.sim is None:
        plots = ("Simulation not yet running. "
                 "Start a simulation to see plots.")
    else:
        plots = []
        rc = PlotInfo("Response curves", plot="multiline")
        rc.x, rc.y = response_curves(ens, viz.sim)
        rc.y = rc.y.T
        if ens.n_neurons > 200:
            rc.warnings.append("Only showing the first 200 neurons.")
            rc.y = rc.y[:200]
        plots.append(rc.to_dict())

        tc = PlotInfo("Tuning curves")
        if ens.dimensions == 1:
            tc.plot = "multiline"
            tc.x, tc.y = tuning_curves(ens, viz.sim)
            tc.y = tc.y.T
            if ens.n_neurons > 200:
                tc.warnings.append("Only showing the first 200 neurons.")
                tc.y = tc.y[:200]
        else:
            tc.warnings.append("Tuning curves only shown for "
                               "one-dimensional ensembles.")
        plots.append(tc.to_dict())

    js = ['VIZ.Modal.title("Details for \'%s\'");' % viz.viz.get_label(ens)]
    js.append('VIZ.Modal.footer("close");')
    js.append('VIZ.Modal.ensemble_body("%s", %s, %s);' % (
        uid, json.dumps(params), json.dumps(plots)))
    js.append('VIZ.Modal.show();')
    return '\n'.join(js)
