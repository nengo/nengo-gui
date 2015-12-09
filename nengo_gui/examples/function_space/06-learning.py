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
fs = nengo.FunctionSpace(nengo.dists.Function(gaussian,
                                              mean=nengo.dists.Uniform(-1, 1),
                                              sd=nengo.dists.Uniform(0.1, 0.7),
                                              mag=1),
                         n_basis=10)
# for creating encoders and eval points
def sample(mean_minmax, sd, mag):
    return fs.project(nengo.dists.Function(gaussian,
                      mean=nengo.dists.Uniform(-mean_minmax, mean_minmax),
                      sd=sd, mag=mag))

model = nengo.Network()
with model:

    ens = nengo.Ensemble(n_neurons=500, dimensions=fs.n_basis)
    # set encoders to be sampled from weights for common functions
    ens.encoders = sample(1, 0.05, 1)
    # set eval points to be sampled from weights for common functions
    ens.eval_points = sample(1, nengo.dists.Uniform(0.1, 0.5), 1)

    # the value that we would like the represented function to
    # be at the current stimulus value (x)
    target_val = nengo.Node(output=[0])

    stimulus = nengo.Ensemble(n_neurons=500, dimensions=1)
    stim_conn = nengo.Connection(stimulus, ens,
            function=lambda x: np.zeros(fs.n_basis),
            learning_rule_type=nengo.PES(learning_rate=.01))

    stim_control = nengo.Node([1])
    nengo.Connection(stim_control, stimulus)

    plot = fs.make_plot_node(domain, lines=1, n_pts=50)

    nengo.Connection(ens, plot, synapse=0.1)

    value = nengo.Node(output=np.sin)
    x = nengo.Ensemble(n_neurons=500, dimensions=1)
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


    total = nengo.Ensemble(50, 1)
    nengo.Connection(product.output, total, transform=[sv_size*max_basis])

    error = nengo.Ensemble(n_neurons=1, dimensions=1, neuron_type=nengo.Direct())

    nengo.Connection(target_val, error)
    nengo.Connection(total, error, transform=-1)

    padder = nengo.Ensemble(n_neurons=1000, dimensions=2, neuron_type=nengo.Direct())
    # so now we have the error and we need to project it back into
    # compressed function representation space
    # first we locate the error
    def pad_error(x):
        error = x[1]
        x = x[0]
        # get a value in the range domain samples
        index = int(x*domain_samples + domain_samples)
        if index > (domain_samples - 1): index = domain_samples - 1
        if index < 0: index = 0
        padded_error = np.zeros(domain_samples)
        padded_error[index] = -error
        return padded_error
    nengo.Connection(x, padder[0])
    nengo.Connection(error, padder[1])

    #filter_error = nengo.networks.EnsembleArray(n_neurons=50, n_ensembles=fs.n_basis,
            #encoders=nengo.dists.Uniform(1,1), intercepts=nengo.dists.Uniform(.01, 1))
    nengo.Connection(padder, stim_conn.learning_rule, function=lambda x: fs.project(pad_error(x)))

    display_error = nengo.Ensemble(n_neurons=1, dimensions=fs.n_basis, neuron_type=nengo.Direct())
    nengo.Connection(padder, display_error, function=lambda x: fs.project(pad_error(x)))
    #nengo.Connection(filter_error.output, stim_conn.learning_rule)

sim = nengo.Simulator(model)
