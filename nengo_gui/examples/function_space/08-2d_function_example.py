import nengo
import nengo.utils.function_space
reload(nengo.utils.function_space)
nengo.dists.Function = nengo.utils.function_space.Function
nengo.FunctionSpace = nengo.utils.function_space.FunctionSpace

# Note: right now the heat map does a normalization
# of all the values from 0 - 255, so the standard deviation nobs
# will affect the shape of it, but if you move them both at the
# same time you won't see a difference.

import numpy as np

# be careful with your sampling here because it gets squared
domain = np.linspace(-1, 1, 10)

# define your 2D function
def gaussian2D(mean_x, mean_y, std_x, std_y):
    x_domain, y_domain = np.meshgrid(domain, domain)
    # flatten the result when returning
    return np.exp(-((x_domain-mean_x)**2./(2.*std_x) +
                          (y_domain-mean_y)**2./(2.*std_y))).flatten()

gauss2D = nengo.dists.Function(gaussian2D,
                    mean_x=nengo.dists.Uniform(-1, 1),
                    mean_y=nengo.dists.Uniform(-1, 1),
                    std_x=nengo.dists.Uniform(.1, .5),
                    std_y=nengo.dists.Uniform(.1, .5))

# build the function space
fs = nengo.FunctionSpace(gauss2D, n_basis=10)

model = nengo.Network()
model.config[nengo.Ensemble].neuron_type = nengo.Direct()
with model:
    ens = nengo.Ensemble(n_neurons=500, dimensions=fs.n_basis)
    ens.encoders = fs.project(gauss2D)
    ens.eval_points = fs.project(gauss2D)

    stimulus1 = fs.make_stimulus_node(gaussian2D, n_params=4)
    nengo.Connection(stimulus1, ens)

    stim_control1 = nengo.Node([0, 0, .5, .5])
    nengo.Connection(stim_control1, stimulus1)

    plot = fs.make_2Dplot_node(domain=domain)
    nengo.Connection(ens, plot[:fs.n_basis])
