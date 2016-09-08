import numpy as np

import nengo
import nengo.utils.function_space
reload(nengo.utils.function_space)

nengo.dists.Function = nengo.utils.function_space.Function
nengo.FunctionSpace = nengo.utils.function_space.FunctionSpace

domain = np.linspace(-1, 1, 200)


# define kinds of functions you'd like to represent
def gaussian(mag, mean, sd):
    return mag * np.exp(-(domain-mean)**2/(2*sd**2))

# build the function space, generate the basis functions
fs = nengo.FunctionSpace(
    nengo.dists.Function(
        gaussian,
        mean=nengo.dists.Uniform(-1, 1),
        sd=nengo.dists.Uniform(0.1, 0.7),
        mag=1),
    n_basis=10)

# create a distribution for generating encoders and eval points
ens_dist = nengo.dists.Function(
    gaussian,
    mean=nengo.dists.Uniform(-1, 1),
    sd=0.05,
    mag=1)

model = nengo.Network()
with model:
    # create an ensemble to represent the weights over the basis functions
    ens = nengo.Ensemble(n_neurons=500, dimensions=fs.n_basis)
    # set encoders and evaluation points to be in a range that gets used
    ens.encoders = fs.project(ens_dist)
    ens.eval_points = fs.project(ens_dist)

    # create a network for input
    input_net = fs.make_input([1, 0, 0.2])
    nengo.Connection(input_net.output, ens)

    # create a node to give a plot of the represented function
    plot = fs.make_plot_node(domain=domain, lines=2)

    nengo.Connection(ens, plot[:fs.n_basis], synapse=0.1)
