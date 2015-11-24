import nengo
import nengo.utils.function_space
reload(nengo.utils.function_space)

import numpy as np



# define your function
def gaussian(points, mean, sd):
    return np.exp(-(points-mean)**2/(2*sd**2))

# build the function space
fs = nengo.utils.function_space.FunctionSpace(gaussian,
                   pts=np.linspace(-1, 1, 200),
                   n_samples=1000, n_basis=10,
                   mean=nengo.dists.Uniform(-1, 1),
                   sd=nengo.dists.Uniform(0.1, 0.7))

model = nengo.Network()
with model:
    ens = nengo.Ensemble(n_neurons=500, dimensions=fs.n_basis)
    fs.set_encoders(ens,
                    mean=nengo.dists.Uniform(-1, 1),
                    sd=0.05)
    fs.set_eval_points(ens, n_eval_points=1000,
                       mean=nengo.dists.Uniform(-1, 1),
                       sd=nengo.dists.Uniform(0.1, 0.5))

    stimulus = fs.make_stimulus_node()
    nengo.Connection(stimulus, ens)

    stim_control = nengo.Node([1, 0, 0.2])
    nengo.Connection(stim_control, stimulus)

    plot = fs.make_plot_node(lines=2, n_pts=50)

    nengo.Connection(ens, plot[:fs.n_basis], synapse=0.1)
    nengo.Connection(stimulus, plot[fs.n_basis:], synapse=0.1)
