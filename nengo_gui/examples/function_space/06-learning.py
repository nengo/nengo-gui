import nengo
import nengo.utils.function_space
reload(nengo.utils.function_space)

nengo.dists.Function = nengo.utils.function_space.Function
nengo.FunctionSpace = nengo.utils.function_space.FunctionSpace

import numpy as np

domain_samples = 200
domain = np.linspace(-1, 1, domain_samples)

def gaussian(mag, mean, sd):
    return mag * np.exp(-(domain-mean)**2/(2*sd**2))

# build the function space
gaussian_space =  nengo.dists.Function(gaussian, superimpose=10,
                                       mean=nengo.dists.Uniform(-1, 1),
                                       sd=nengo.dists.Uniform(0.1, 0.7),
                                       mag=nengo.dists.Uniform(-1, 1))
fs = nengo.FunctionSpace(gaussian_space, n_basis=10)

model = nengo.Network()
with model:

    ens = nengo.Ensemble(n_neurons=500, dimensions=fs.n_basis)
    # set encoders to be sampled from weights for common functions
    ens.encoders = fs.project(gaussian_space)
    # set eval points to be sampled from weights for common functions
    ens.eval_points = fs.project(gaussian_space)

    # the value that we would like the represented function to
    # be at the current stimulus value (x)
    target_val = nengo.Node(output=[0])

    stim_control = nengo.Node([1])
    stimulus = nengo.Ensemble(n_neurons=500, dimensions=1)
    stim_conn = nengo.Connection(stimulus, ens,
            function=lambda x: np.zeros(fs.n_basis),
            learning_rule_type=nengo.PES(learning_rate=.05))

    nengo.Connection(stim_control, stimulus)

    plot = fs.make_plot_node(domain, lines=1, n_pts=50)#, max_y=10, min_y=-10)
    nengo.Connection(ens, plot, synapse=0.1)

    value = nengo.Node(output=np.sin)
    x = nengo.Ensemble(n_neurons=500, dimensions=1, neuron_type=nengo.Direct())
    nengo.Connection(value, x)

    product = nengo.networks.Product(n_neurons=100, dimensions=fs.n_basis)
    sv_size = (fs.S/fs.scale)[:fs.n_basis]
    max_basis = np.max(fs.basis*fs.scale)
    # here we are getting the activation at point x from each basis function
    # and passing that in to product.B, we then get the weights for each of
    # those basis functions and pass that in to product.A
    # the weighted summation of these across all dimensions is the value of the
    # represented function at x
    for i in range(fs.n_basis):
        def basis_fn(x, i=i):
            # get a value in the range domain samples
            # TODO: there should also be scaling for range represented by
            # the function, right?
            index = int(x[0]*domain_samples + domain_samples)
            if index > (domain_samples - 1): index = domain_samples - 1
            if index < 0: index = 0
            return fs.basis[index][i]*fs.scale/max_basis
        nengo.Connection(x, product.B[i], function=basis_fn)
        nengo.Connection(ens[i], product.A[i], transform=1.0/sv_size[i])

    total = nengo.Ensemble(500, 1, neuron_type=nengo.Direct())
    nengo.Connection(product.output, total, transform=[sv_size*max_basis])

    error = nengo.Ensemble(n_neurons=1, dimensions=1, neuron_type=nengo.Direct())
    nengo.Connection(target_val, error)
    nengo.Connection(total, error, transform=-1)

    padder = nengo.Ensemble(n_neurons=500, dimensions=2, neuron_type=nengo.Direct())
    # so now we have the error and we need to project it back into
    # compressed function representation space
    # first we locate the error
    def pad_error(x):
        error = x[1]
        x = x[0]
        sd = 0.05
        # get a value in the range domain samples
        return error * np.exp(-(domain-x)**2/(2*sd**2))
    nengo.Connection(x, padder[0])
    nengo.Connection(error, padder[1])

    display_error = nengo.Ensemble(n_neurons=1, dimensions=fs.n_basis, neuron_type=nengo.Direct())
    nengo.Connection(display_error, stim_conn.learning_rule)
    nengo.Connection(padder, display_error, function=lambda x: fs.project(pad_error(x)))

sim = nengo.Simulator(model)
sim.run(1)
