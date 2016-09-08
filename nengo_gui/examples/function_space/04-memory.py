import numpy as np

import nengo
import nengo.utils.function_space
reload(nengo.utils.function_space)

nengo.dists.Function = nengo.utils.function_space.Function
nengo.FunctionSpace = nengo.utils.function_space.FunctionSpace

domain = np.linspace(-1, 1, 200)


# define your function
def gaussian(mag, mean, sd):
    return mag * np.exp(-(domain-mean)**2/(2*sd**2))

# build the function space
fs = nengo.FunctionSpace(
    nengo.dists.Function(
        gaussian,
        mean=nengo.dists.Uniform(-1, 1),
        sd=nengo.dists.Uniform(0.05, 0.2),
        mag=1),
    n_basis=10)

model = nengo.Network()
with model:
    # create an ensemble to represent the weights over the basis functions
    memory = nengo.Ensemble(n_neurons=2000, dimensions=fs.n_basis)
    # use separate distributions for the encoders and the evaluation points.
    # TODO: why?
    memory.encoders = fs.project(
        nengo.dists.Function(gaussian,
                             mean=nengo.dists.Uniform(-1, 1),
                             sd=0.05,
                             mag=1))
    memory.eval_points = fs.project(
        nengo.dists.Function(gaussian,
                             mean=nengo.dists.Uniform(-1, 1),
                             sd=nengo.dists.Uniform(0.1, 0.2),
                             mag=nengo.dists.Uniform(0, 1)))

    stimulus = fs.make_input([1, 0, 0.2])
    nengo.Connection(stimulus.output, memory)

    # set up integration
    nengo.Connection(memory, memory, synapse=0.1)

    # create a node to give a plot of the represented function
    plot = fs.make_plot_node(domain=domain, lines=2, n_pts=50)
    nengo.Connection(memory, plot[:fs.n_basis], synapse=0.1)
    nengo.Connection(stimulus.output, plot[fs.n_basis:], synapse=0.1)
