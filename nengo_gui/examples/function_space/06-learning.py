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
gaussian_space =  nengo.dists.Function(gaussian, 
                                       mean=nengo.dists.Uniform(-1, 1),
                                       sd=nengo.dists.Uniform(0.01, 0.2),
                                       mag=nengo.dists.Uniform(-1, 1)) 
fs = nengo.FunctionSpace(gaussian_space, n_basis=30)

model = nengo.Network()
model.config[nengo.Ensemble].neuron_type = nengo.Direct()
with model:
   
    # ensemble that store weights over basis functions 
    # for the compressed function representation
    sing_vals = nengo.Ensemble(n_neurons=1, dimensions=fs.n_basis, radius=5)
    # set encoders to be sampled from weights for common functions
    sing_vals.encoders = fs.project(gaussian_space)
    # set eval points to be sampled from weights for common functions
    sing_vals.eval_points = fs.project(gaussian_space)

    # input to the stimulus population, whose output projects the 
    # compressed function representation weights into sing_vals
    # change stim_control for learning different functions in 
    # the same set of decoders
    stimulus = nengo.Ensemble(n_neurons=500, dimensions=1, 
            neuron_type=nengo.LIF())
    # learning connection 
    stim_conn = nengo.Connection(stimulus, sing_vals, 
            function=lambda x: np.zeros(fs.n_basis),
            learning_rule_type=nengo.PES(learning_rate=.0005))
    # handy function plotting node to see the represented function 
    plot = fs.make_plot_node(domain, lines=1, n_pts=100, 
                             max_x=1, min_x=-1, max_y=2, min_y=-2)
    nengo.Connection(sing_vals, plot, synapse=0.1)

    # the x value we'd like to sample from the represented function
    x = nengo.Node(output=np.sin)

    # in this case, learn two different Gaussians, 
    # for different stim control values, which change 
    # every so often (2 seconds at the moment)
    def train_gaussians(t,x):
        stim = 1 if int(t) % 2 == 0 else -1 
        g = gaussian(1, stim/2.0, .05)
        index = int(x[0] * n_samples/2 + n_samples/2)
        return g[index], stim
    # the target f(x) value for the represented function
    target_fx = nengo.Node(output=train_gaussians, size_in=1)
    nengo.Connection(x, target_fx)
    nengo.Connection(target_fx[1], stimulus)

    # this is for sampling from the represented function
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
            # TODO: there should also be scaling for range 
            # represented by the function
            index = int(x[0]*n_samples/2 + n_samples/2)
            if index > (n_samples - 1): index = n_samples - 1
            if index < 0: index = 0
            return fs.basis[index][i]*fs.scale/max_basis
        nengo.Connection(x, product.B[i], function=basis_fn)
        nengo.Connection(sing_vals[i], product.A[i], transform=1.0/sv_size[i])

    # the population representing f(x)
    fx = nengo.Ensemble(n_neurons=1, dimensions=1)
    nengo.Connection(product.output, fx, transform=[sv_size*max_basis])

    # calculate the error at the sampled function value
    error_fx = nengo.Ensemble(n_neurons=1, dimensions=1)
    nengo.Connection(target_fx[0], error_fx, transform=-1)
    nengo.Connection(fx, error_fx, transform=1)

    # project error into compressed function space
    bar_x = np.linspace(0, 50, n_samples)
    def pad_error(x):
        error_fx = x[1]
        x = x[0]
        # put a representable Gaussian bump where the error is 
        # in the function space with error amplitude
        sd = 0.004
        error_gauss = error_fx * np.exp(-(domain-x)**2/(2*sd**2))

        return error_gauss
    error = nengo.Ensemble(n_neurons=1, dimensions=fs.n_basis)
    nengo.Connection(error, stim_conn.learning_rule, 
                    function=lambda x: fs.project(pad_error(x)))
    nengo.Connection(x, error[0])
    nengo.Connection(error_fx, error[1])

    def pad_error_vis(t, x):
        error_gauss = pad_error(x)
        # # visualization code ----------------
        scale = 20
        y_bias = 50
        line_width = 2
        display_error_threshold = 0.001
        bar_graph = '''<svg width="100%" height="100%" viewbox="0 0 100 100">'''
        for ii in range(n_samples):
            if abs(error_gauss[ii]) > display_error_threshold:
                val = error_gauss[ii] * scale + y_bias 
                bar_graph += '''<line x1="{0}" y1="51" x2="{0}" y2="{1}" stroke-width="{2}" style="stroke:black"/>'''.format(
                        bar_x[ii] * line_width, val, line_width)
        pad_error_vis._nengo_html_ = bar_graph
        # end of visualization code ---------
    error_vis = nengo.Node(output=pad_error_vis, size_in=2)
    nengo.Connection(x, error_vis[0])
    nengo.Connection(error_fx, error_vis[1])


sim = nengo.Simulator(model)
sim.run(1)
