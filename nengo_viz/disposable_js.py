"""One-off functions that create Javascript calls"""

import json

import nengo


def infomodal(viz, obj):
    if isinstance(obj, nengo.Ensemble):
        return ensemble_infomodal(viz, obj)
    else:
        raise NotImplementedError()


def ensemble_infomodal(viz, ens):
    params = [(attr, str(getattr(ens, attr))) for attr in (
        'n_neurons', 'dimensions', 'radius', 'encoders', 'intercepts',
        'max_rates', 'eval_points', 'n_eval_points', 'neuron_type',
        'noise', 'seed') if getattr(ens, attr) is not None]

    siminfo = {}
    connections = {}

    # info = {}
    # siminfo = {}
    js = ['VIZ.Modal.title("Details for \'%s\'");' % viz.viz.get_label(ens)]
    js.append('VIZ.Modal.footer("close");')
    js.append('VIZ.Modal.ensemble_body(%s, %s, %s);' % (
        json.dumps(params), json.dumps(siminfo), json.dumps(connections)))
    js.append('VIZ.Modal.show();')
    return '\n'.join(js)
