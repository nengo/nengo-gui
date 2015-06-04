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

def add_modal_title_js(title_text):
    return 'Nengo.modal.title("%s");' % (title_text)

def add_modal_footer_js(footer_text):
    return 'Nengo.modal.footer("%s");' % (footer_text)

def show_modal_js():
    return 'Nengo.modal.show();'

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

def ensemble_infomodal(ng, uid, conn_in_uids, conn_out_uids):
    ens = ng.uids[uid]

    params = [(attr, str(getattr(ens, attr))) for attr in (
        'n_neurons', 'dimensions', 'radius', 'encoders', 'intercepts',
        'max_rates', 'eval_points', 'n_eval_points', 'neuron_type',
        'noise', 'seed') if getattr(ens, attr) is not None]

    if ng.viz.sim is None:
        plots = ("Simulation not yet running. "
                 "Start a simulation to see plots.")
    else:
        plots = []
        rc = PlotInfo("Response curves", plot="multiline")
        rc.x, rc.y = response_curves(ens, ng.viz.sim)
        rc.y = rc.y.T
        if ens.n_neurons > 200:
            rc.warnings.append("Only showing the first 200 neurons.")
            rc.y = rc.y[:200]
        plots.append(rc.to_dict())

        tc = PlotInfo("Tuning curves")
        if ens.dimensions == 1:
            tc.plot = "multiline"
            tc.x, tc.y = tuning_curves(ens, ng.viz.sim)
            tc.y = tc.y.T
            if ens.n_neurons > 200:
                tc.warnings.append("Only showing the first 200 neurons.")
                tc.y = tc.y[:200]
        else:
            tc.warnings.append("Tuning curves only shown for "
                               "one-dimensional ensembles.")
        plots.append(tc.to_dict())

    conninfo = conn_infomodal(ng, uid, conn_in_uids, conn_out_uids)

    js = ['Nengo.modal.title("Details for \'%s\'");' % ng.viz.viz.get_label(ens)]
    js.append('Nengo.modal.footer("close");')
    js.append('Nengo.modal.ensemble_body("%s", %s, %s, %s);' % (
        uid, json.dumps(params), json.dumps(plots), json.dumps(conninfo)))
    js.append('Nengo.modal.show();')
    return '\n'.join(js)

def node_infomodal(ng, uid, conn_in_uids, conn_out_uids):
    node = ng.uids[uid]

    params = [(attr, str(getattr(node, attr))) for attr in (
        'output', 'size_in', 'size_out') if getattr(node, attr) is not None]

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

    plots = [f_out.to_dict()]

    conninfo = conn_infomodal(ng, uid, conn_in_uids, conn_out_uids)

    js = [add_modal_title_js("Details for \'%s\'" % (
        ng.viz.viz.get_label(node)))]
    js.append(add_modal_footer_js('close'))
    js.append('Nengo.modal.node_body("%s", %s, %s, %s);' % (
        uid, json.dumps(params), json.dumps(plots), json.dumps(conninfo)))
    js.append(show_modal_js())
    return '\n'.join(js)


def conn_infomodal(ng, uid, conn_in_uids, conn_out_uids):
    conninfo = {}

    conninfo["obj_type"] = {}
    conninfo["func"] = {}
    conninfo["fan"] = {}

    def get_conn_func_str(conn_uid):
        return (str(ng.uids[conn_uid].function)
                if ng.uids[conn_uid].function is not None
                else "Identity function")

    def get_obj_info(nengo_obj):
        if isinstance(nengo_obj, nengo.Node):
            if nengo_obj.output is None:
                return "passthrough", "> 0"
            else:
                return "node", "0"
        elif isinstance(nengo_obj, nengo.Ensemble):
            return "ens", str(nengo_obj.n_neurons)
        elif isinstance(nengo_obj, nengo.Network):
            return "net", str(sum(map(lambda e: e.n_neurons,
                                      nengo_obj.all_ensembles)))
        else:
            return "err", "0"

    for conn_uid in conn_in_uids:
        conninfo["obj_type"][conn_uid], conninfo["fan"][conn_uid] = \
            get_obj_info(ng.uids[conn_uid].pre_obj)
        conninfo["func"][conn_uid] = get_conn_func_str(conn_uid)

    for conn_uid in conn_out_uids:
        conninfo["obj_type"][conn_uid], conninfo["fan"][conn_uid] = \
            get_obj_info(ng.uids[conn_uid].post_obj)
        conninfo["func"][conn_uid] = get_conn_func_str(conn_uid)

    return conninfo


def net_infomodal(ng, uid, conn_in_uids, conn_out_uids):
    net = ng.uids[uid]

    stats = []
    stats.append({
        'title': "In this network",
        'stats': [
            ('Number of ensembles', len(net.ensembles)),
            ('Total number of neurons',
             sum(e.n_neurons for e in net.ensembles)),
            ('Number of nodes', len(net.nodes)),
            ('Number of connections', len(net.connections)),
            ('Number of subnetworks', len(net.networks)),
        ]})
    stats.append({
        'title': "In this network and subnetworks",
        'stats': [
            ('Number of ensembles', len(net.all_ensembles)),
            ('Total number of neurons',
             sum(e.n_neurons for e in net.all_ensembles)),
            ('Number of nodes', len(net.all_nodes)),
            ('Number of connections', len(net.all_connections)),
            ('Number of subnetworks', len(net.all_networks)),
        ]})

    conninfo = conn_infomodal(ng, uid, conn_in_uids, conn_out_uids)

    js = [add_modal_title_js("Details for \'%s\'") % (
        ng.viz.viz.get_label(net))]
    js.append(add_modal_footer_js('close'))
    js.append('Nengo.modal.net_body("%s", %s, %s);' % (
        uid, json.dumps(stats), json.dumps(conninfo)))
    js.append(show_modal_js())
    return '\n'.join(js)
