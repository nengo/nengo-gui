"""One-off functions that create Javascript calls"""

import json

import nengo


def infomodal(viz, obj, uid):
    if isinstance(obj, nengo.Ensemble):
        return ensemble_infomodal(viz, obj, uid)
    else:
        raise NotImplementedError()


def ensemble_infomodal(viz, ens, uid):
    params = [(attr, str(getattr(ens, attr))) for attr in (
        'n_neurons', 'dimensions', 'radius', 'encoders', 'intercepts',
        'max_rates', 'eval_points', 'n_eval_points', 'neuron_type',
        'noise', 'seed') if getattr(ens, attr) is not None]

    siminfo = {}

    # info = {}
    # siminfo = {}
    js = ['VIZ.Modal.title("Details for \'%s\'");' % viz.viz.get_label(ens)]
    js.append('VIZ.Modal.footer("close");')
    js.append('VIZ.Modal.ensemble_body("%s", %s, %s);' % (
        uid, json.dumps(params), json.dumps(siminfo)))
    js.append('VIZ.Modal.show();')
    return '\n'.join(js)
