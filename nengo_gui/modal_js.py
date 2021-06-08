"""One-off functions that create Javascript calls"""

import json

import nengo
import numpy as np

from .static_plots import node_output_plot, response_curve_plot, tuning_curve_plot


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
    return "Nengo.modal.show();"


def ensemble_infomodal(ng, uid, conn_in_uids, conn_out_uids):
    ens = ng.uids[uid]

    params = [
        (attr, str(getattr(ens, attr)))
        for attr in (
            "n_neurons",
            "dimensions",
            "radius",
            "encoders",
            "intercepts",
            "max_rates",
            "eval_points",
            "n_eval_points",
            "neuron_type",
            "noise",
            "seed",
        )
        if getattr(ens, attr) is not None
    ]

    if ng.page.sim is None:
        plots = "Simulation not yet running. " "Start a simulation to see plots."
    else:
        plots = []
        plots.append(response_curve_plot(ens, ng.page.sim))
        plots.append(tuning_curve_plot(ens, ng.page.sim))

    conninfo = conn_infomodal(ng, uid, conn_in_uids, conn_out_uids)

    js = ["Nengo.modal.title(\"Details for '%s'\");" % ng.page.get_label(ens)]
    js.append('Nengo.modal.footer("close");')
    js.append(
        'Nengo.modal.ensemble_body("%s", %s, %s, %s);'
        % (uid, json.dumps(params), json.dumps(plots), json.dumps(conninfo))
    )
    js.append("Nengo.modal.show();")
    return "\n".join(js)


def node_infomodal(ng, uid, conn_in_uids, conn_out_uids):
    node = ng.uids[uid]

    params = [
        (attr, str(getattr(node, attr)))
        for attr in ("output", "size_in", "size_out")
        if getattr(node, attr) is not None
    ]

    plots = [node_output_plot(node)]

    conninfo = conn_infomodal(ng, uid, conn_in_uids, conn_out_uids)

    js = [add_modal_title_js("Details for '%s'" % (ng.page.get_label(node)))]
    js.append(add_modal_footer_js("close"))
    js.append(
        'Nengo.modal.node_body("%s", %s, %s, %s);'
        % (uid, json.dumps(params), json.dumps(plots), json.dumps(conninfo))
    )
    js.append(show_modal_js())
    return "\n".join(js)


def conn_infomodal(ng, uid, conn_in_uids, conn_out_uids):
    conninfo = {}

    conninfo["obj_type"] = {}
    conninfo["func"] = {}
    conninfo["fan"] = {}

    def get_conn_func_str(conn_uid):
        return (
            str(ng.uids[conn_uid].function)
            if ng.uids[conn_uid].function is not None
            else "Identity function"
        )

    def get_obj_info(nengo_obj):
        if isinstance(nengo_obj, nengo.Node):
            if nengo_obj.output is None:
                return "passthrough", "> 0"
            else:
                return "node", "0"
        elif isinstance(nengo_obj, nengo.Ensemble):
            return "ens", str(nengo_obj.n_neurons)
        elif isinstance(nengo_obj, nengo.Network):
            return "net", str(sum(map(lambda e: e.n_neurons, nengo_obj.all_ensembles)))
        else:
            return "err", "0"

    for conn_uid in conn_in_uids:
        conninfo["obj_type"][conn_uid], conninfo["fan"][conn_uid] = get_obj_info(
            ng.uids[conn_uid].pre_obj
        )
        conninfo["func"][conn_uid] = get_conn_func_str(conn_uid)

    for conn_uid in conn_out_uids:
        conninfo["obj_type"][conn_uid], conninfo["fan"][conn_uid] = get_obj_info(
            ng.uids[conn_uid].post_obj
        )
        conninfo["func"][conn_uid] = get_conn_func_str(conn_uid)

    return conninfo


def net_infomodal(ng, uid, conn_in_uids, conn_out_uids):
    net = ng.uids[uid]

    stats = []
    stats.append(
        {
            "title": "In this network",
            "stats": [
                ("Number of ensembles", len(net.ensembles)),
                ("Total number of neurons", sum(e.n_neurons for e in net.ensembles)),
                ("Number of nodes", len(net.nodes)),
                ("Number of connections", len(net.connections)),
                ("Number of subnetworks", len(net.networks)),
            ],
        }
    )
    stats.append(
        {
            "title": "In this network and subnetworks",
            "stats": [
                ("Number of ensembles", len(net.all_ensembles)),
                (
                    "Total number of neurons",
                    sum(e.n_neurons for e in net.all_ensembles),
                ),
                ("Number of nodes", len(net.all_nodes)),
                ("Number of connections", len(net.all_connections)),
                ("Number of subnetworks", len(net.all_networks)),
            ],
        }
    )

    conninfo = conn_infomodal(ng, uid, conn_in_uids, conn_out_uids)

    js = [add_modal_title_js("Details for '%s'") % (ng.page.get_label(net))]
    js.append(add_modal_footer_js("close"))
    js.append(
        'Nengo.modal.net_body("%s", %s, %s);'
        % (uid, json.dumps(stats), json.dumps(conninfo))
    )
    js.append(show_modal_js())
    return "\n".join(js)
