import numpy as np

import nengo
import nengo.utils.function_space
reload(nengo.utils.function_space)
nengo.dists.Function = nengo.utils.function_space.Function
nengo.FunctionSpace = nengo.utils.function_space.FunctionSpace

# be careful with number of samples here because it gets squared
domain = np.linspace(-1, 1, 15)

min_std = .1
max_std = .5


# define kinds of functions you'd like to represent
def gaussian2D(mean_x, mean_y, std_x, std_y):
    x_domain, y_domain = np.meshgrid(domain, domain)
    std_x = min(max(std_x, min_std), max_std)
    std_y = min(max(std_y, min_std), max_std)
    # flatten the result when returning
    return np.exp(-((x_domain-mean_x)**2./(2.*std_x) +
                    (y_domain-mean_y)**2./(2.*std_y))).flatten()

# create a distribution over the function space
gauss2D = nengo.dists.Function(
    gaussian2D,
    mean_x=nengo.dists.Uniform(-1, 1),
    mean_y=nengo.dists.Uniform(-1, 1),
    std_x=nengo.dists.Uniform(min_std, max_std),
    std_y=nengo.dists.Uniform(min_std, max_std))

# build the function space, generate the basis functions
fs = nengo.FunctionSpace(gauss2D, n_basis=12)

model = nengo.Network()
model.config[nengo.Ensemble].neuron_type = nengo.Direct()
with model:
    # create an ensemble to represent the weights over the basis functions
    ens = nengo.Ensemble(n_neurons=500, dimensions=fs.n_basis)
    # set encoders and evaluation points to be in a range that gets used
    ens.encoders = fs.project(gauss2D)
    ens.eval_points = fs.project(gauss2D)

    # create a network for input
    stimulus = fs.make_input([0, 0, .5, .5])
    nengo.Connection(stimulus.output, ens)

    # create a node to give a 2D plot of the represented function
    plot = fs.make_2Dplot_node(domain=domain, n_pts=30)
    nengo.Connection(ens, plot[:fs.n_basis])
