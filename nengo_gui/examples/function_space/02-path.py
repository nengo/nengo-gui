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
    function_plot = fs.make_plot_node(domain, lines=1, n_pts=50)

    nengo.Connection(ens, function_plot, synapse=0.1)

    # a node to specify which part of the function to decode
    x_value = nengo.Node(np.cos)
    product = nengo.networks.Product(n_neurons=100, dimensions=fs.n_basis)

    # get the size of each of the singular values scaled by the average
    # magnitude of weights for data calculated from provided distribution
    sv_size = (fs.S/fs.scale)[:fs.n_basis]
    # get the size of the largest basis function for normalization
    max_basis = np.max(fs.basis*fs.scale)
    for ii in range(fs.n_basis):
        # function to generate find the value of the
        # basis function at a specified value of x
        def basis_fn(x, i=ii):
            index = int(x[0]*100+100)
            if index > 199:
                index = 199
            if index < 0:
                index = 0
            return fs.basis[index][ii]*fs.scale/max_basis
        # multiply the value of each basis function at x with the current weighting
        nengo.Connection(x_value, product.B[ii], function=basis_fn)
        nengo.Connection(ens[ii], product.A[ii], transform=1.0/sv_size[ii])

    output = nengo.Ensemble(50, 1)
    nengo.Connection(product.output, output, transform=[sv_size*max_basis])
