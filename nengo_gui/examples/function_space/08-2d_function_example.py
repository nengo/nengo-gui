import nengo
import nengo.utils.function_space
reload(nengo.utils.function_space)
nengo.dists.Function = nengo.utils.function_space.Function
nengo.FunctionSpace = nengo.utils.function_space.FunctionSpace

import numpy as np

# be careful with number of samples here because it gets squared
domain = np.linspace(-1, 1, 15)

min_std = .1
max_std = .5
# define your 2D function
def gaussian2D(mean_x, mean_y, std_x, std_y):
    x_domain, y_domain = np.meshgrid(domain, domain)
    std_x = min(max(std_x, min_std), max_std)
    std_y = min(max(std_y, min_std), max_std)
    # flatten the result when returning
    return np.exp(-((x_domain-mean_x)**2./(2.*std_x) + 
                          (y_domain-mean_y)**2./(2.*std_y))).flatten()

gauss2D = nengo.dists.Function(gaussian2D, 
                    mean_x=nengo.dists.Uniform(-1, 1),
                    mean_y=nengo.dists.Uniform(-1, 1),
                    std_x=nengo.dists.Uniform(min_std, max_std),
                    std_y=nengo.dists.Uniform(min_std, max_std))

# build the function space
fs = nengo.FunctionSpace(gauss2D, n_basis=12)

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
