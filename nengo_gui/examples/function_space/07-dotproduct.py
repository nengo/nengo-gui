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

# create a distribution sampling that function space
gauss = nengo.dists.Function(gaussian,
                             mean=nengo.dists.Uniform(-1, 1),
                             sd=nengo.dists.Uniform(0.1, 0.5),
                             mag=nengo.dists.Uniform(-1, 1))

# build the function space, generate the basis functions
fs = nengo.FunctionSpace(gauss, n_basis=20)

model = nengo.Network()
with model:
    # an ensemble representing the first function
    ens1 = nengo.Ensemble(n_neurons=1000, dimensions=fs.n_basis)
    # set encoders and evaluation points to be in a range that gets used
    ens1.encoders = fs.project(gauss)
    ens1.eval_points = fs.project(gauss)

    # an ensemble representing the second function
    ens2 = nengo.Ensemble(n_neurons=1000, dimensions=fs.n_basis)
    # set encoders and evaluation points to be in a range that gets used
    ens2.encoders = fs.project(gauss)
    ens2.eval_points = fs.project(gauss)

    # create a network for input to ens1
    stimulus1 = fs.make_input([1, 0, 0.2])
    nengo.Connection(stimulus1.output, ens1)

    # create a network for input to ens2
    stimulus2 = fs.make_input([1, 0, 0.2])
    nengo.Connection(stimulus2.output, ens2)

    n_neurons = 5000
    # create a population for calculating the dot product
    ens3 = nengo.Ensemble(n_neurons=n_neurons, dimensions=fs.n_basis*2)
    # this population has twice as many weights represented, stack samples
    ens3.encoders = np.hstack([fs.project(gauss).sample(n_neurons),
                               fs.project(gauss).sample(n_neurons)])
    # 5000 chosen here somewhat arbitrarily as larger
    # than default number of samples for eval_points
    ens3.eval_points = np.vstack([
        np.hstack([fs.project(gauss).sample(5000),
                   fs.project(gauss).sample(5000)])])
    nengo.Connection(ens1, ens3[:fs.n_basis])
    nengo.Connection(ens2, ens3[fs.n_basis:])

    # ensemble that will represent the dot product of the function
    # represented in ens1 and the function represented in ens2
    dot_product_output = nengo.Ensemble(n_neurons=50, dimensions=1)

    def dotproduct(x):
        # reconstruct the functions from the basis function weights
        p = fs.reconstruct(x[:fs.n_basis])
        q = fs.reconstruct(x[fs.n_basis:])
        # normalize unless the sum is zero
        norm_p = np.linalg.norm(p)
        norm_q = np.linalg.norm(q)
        p = p/norm_p if norm_p != 0 else p
        q = q/norm_q if norm_q != 0 else q
        return np.dot(p, q)

    nengo.Connection(ens3, dot_product_output, function=dotproduct)

    # create a node to give a plot of the represented function
    plot = fs.make_plot_node(domain=domain, lines=2)
    nengo.Connection(ens1, plot[:fs.n_basis], synapse=0.1)
    nengo.Connection(ens2, plot[fs.n_basis:], synapse=0.1)
