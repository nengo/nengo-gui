import nengo
import nengo.utils.function_space
reload(nengo.utils.function_space)

nengo.dists.Function = nengo.utils.function_space.Function
nengo.FunctionSpace = nengo.utils.function_space.FunctionSpace

import numpy as np

n_samples = 200
domain = np.linspace(-1, 1, n_samples)

def gaussian(mag, mean, sd):
    return mag * np.exp(-(domain-mean)**2/(2*sd**2))

# build the function space
n_basis = 50
gaussian_space =  nengo.dists.Function(gaussian, superimpose=30,
                                       mean=nengo.dists.Uniform(-1, 1),
                                       sd=nengo.dists.Uniform(0.01, 0.2),
                                       mag=nengo.dists.Uniform(-1, 1))
fs = nengo.FunctionSpace(gaussian_space, n_basis=50)
# set the basis functions to be Gaussians tiled
# across the represented function space
fs._basis = np.zeros((n_samples, n_basis))
means = np.linspace(-1, 1, n_basis)
for ii,mean in enumerate(means):
    fs._basis[:,ii] = 1 * np.exp(-(domain-mean)**2/(2*.025**2))
fs._scale = np.mean(np.linalg.norm(fs._basis, axis=1))**2
fs._S = np.ones(n_basis)

model = nengo.Network()
model.config[nengo.Ensemble].neuron_type = nengo.Direct()
with model:

    ens = nengo.Ensemble(n_neurons=1, dimensions=fs.n_basis, radius=5)
    # set encoders to be sampled from weights for common functions
    ens.encoders = fs.project(gaussian_space)
    # set eval points to be sampled from weights for common functions
    ens.eval_points = fs.project(gaussian_space)

    stim_control = nengo.Node([1])
    stimulus = nengo.Ensemble(n_neurons=500, dimensions=1,
            neuron_type=nengo.LIF())
    stim_conn = nengo.Connection(stimulus, ens,
            function=lambda x: np.zeros(fs.n_basis),
            learning_rule_type=nengo.PES(learning_rate=.000005))

    nengo.Connection(stim_control, stimulus)

    plot = fs.make_plot_node(domain, lines=1, n_pts=100,
                             max_x=1, min_x=-1, max_y=1, min_y=-1)
    nengo.Connection(ens, plot, synapse=0.1)

    value = nengo.Node(output=np.sin)
    x = nengo.Ensemble(n_neurons=1, dimensions=1)
    nengo.Connection(value, x)

    # the value that we would like the represented function to
    # be at the current stimulus value (x)
    # target_val = nengo.Node(output=[0])
    target_val = nengo.Ensemble(n_neurons=1, dimensions=1)
    nengo.Connection(value, target_val, function=lambda x: x)

    product = nengo.networks.Product(n_neurons=1, dimensions=fs.n_basis)
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
            index = int(x[0]*n_samples + n_samples)
            if index > (n_samples - 1): index = n_samples - 1
            if index < 0: index = 0
            return fs.basis[index][i]*fs.scale/max_basis
        nengo.Connection(x, product.B[i], function=basis_fn)
        nengo.Connection(ens[i], product.A[i], transform=1.0/sv_size[i])

    total = nengo.Ensemble(1, 1)
    nengo.Connection(product.output, total, transform=[sv_size*max_basis])

    error = nengo.Ensemble(n_neurons=1, dimensions=1)
    nengo.Connection(target_val, error, transform=-1)
    nengo.Connection(total, error, transform=1)

    padder = nengo.Ensemble(n_neurons=1, dimensions=2)
    # so now we have the error and we need to project it back into
    # compressed function representation space
    # first we locate the error
    def pad_error(t, x):
        error_val = x[1]
        x = x[0]
        sd = 0.01
        # get a value in the range domain samples
        error_gauss = error_val * np.exp(-(domain-x)**2/(2*sd**2))

        # visualization code ----------------
        bar_x = np.linspace(0, 100, n_samples)
        scaled = -40
        # just trying to get something to show up right now:
        bar_graph = '''<svg width="100%" height="100%" viewbox="0 0 100 100">
                       <line x1="50" y1="0" x2="50" y2="{scaled}" style="stroke:black"/>'''
        # for ii in range(n_samples):
        #     bar_graph += '''<line x1="{%i}" y1=0 x2={%i} y2={%i} style="stroke:black"/>'''%(bar_x[ii],
        #                                                                                     bar_x[ii],
        #                                                                                     error_gauss[ii])
        bar_graph += '''</svg>'''

        pad_error._nengo_html_ = bar_graph.format(**locals())
        # end of visualization code ---------

        return error_gauss

    nengo.Connection(x, padder[0])
    nengo.Connection(error, padder[1])

    display_error = nengo.Ensemble(n_neurons=1, dimensions=fs.n_basis)
    vector_error = nengo.Node(output=pad_error, size_in=2)
    nengo.Connection(display_error, stim_conn.learning_rule)
    nengo.Connection(vector_error, display_error,
                     function=lambda x: fs.project(x))
    nengo.Connection(padder, vector_error)

sim = nengo.Simulator(model)
sim.run(1)
