import nengo
import nengo.utils.function_space
reload(nengo.utils.function_space)

nengo.dists.Function = nengo.utils.function_space.Function
nengo.FunctionSpace = nengo.utils.function_space.FunctionSpace


import numpy as np


domain = np.linspace(-1, 1, 200)

# define your function
def gaussian(mag, mean, sd):
    return mag * np.exp(-(domain-mean)**2/(2*sd**2))

gauss = nengo.dists.Function(gaussian,
                       mean=nengo.dists.Uniform(-1, 1),
                       sd=nengo.dists.Uniform(0.1, 0.5),
                       mag=1)

# build the function space
fs = nengo.FunctionSpace(nengo.dists.Function(gaussian,
                                              mean=nengo.dists.Uniform(-1, 1),
                                              sd=nengo.dists.Uniform(0.1, 0.7),
                                              mag=1), 
                         n_basis=10)

model = nengo.Network()
#model.config[nengo.Ensemble].neuron_type = nengo.Direct()
with model:
    ens1 = nengo.Ensemble(n_neurons=500, dimensions=fs.n_basis, 
            neuron_type=nengo.Direct())
    ens1.encoders = fs.project(gauss)
    ens1.eval_points = fs.project(gauss)
    
    stimulus1 = fs.make_stimulus_node(gaussian, 3)
    nengo.Connection(stimulus1, ens1)
    
    stim_control1 = nengo.Node([1, 0, 0.2])
    nengo.Connection(stim_control1, stimulus1)
    
    ens2 = nengo.Ensemble(n_neurons=500, dimensions=fs.n_basis, 
            neuron_type=nengo.Direct())
    ens2.encoders = fs.project(gauss)
    ens2.eval_points = fs.project(gauss)
    
    stimulus2 = fs.make_stimulus_node(gaussian, 3)
    nengo.Connection(stimulus2, ens2)
    
    stim_control2 = nengo.Node([1, 0, 0.2])
    nengo.Connection(stim_control2, stimulus2)
    
    n_neurons=1500
    ens3 = nengo.Ensemble(n_neurons=n_neurons, dimensions=fs.n_basis*2)
    ens3.encoders = np.hstack([fs.project(gauss).sample(n_neurons), 
                                  fs.project(gauss).sample(n_neurons)])
    ens3.eval_points = np.vstack([
                        -1 * np.hstack([fs.project(gauss).sample(5000), 
                                  fs.project(gauss).sample(5000)]),
                        np.hstack([fs.project(gauss).sample(5000), 
                                  fs.project(gauss).sample(5000)])])
    #ens3.neuron_type=nengo.Direct()
    nengo.Connection(ens1, ens3[:fs.n_basis])
    nengo.Connection(ens2, ens3[fs.n_basis:])

    plot = fs.make_plot_node(domain=domain, lines=2)
    nengo.Connection(ens1, plot[:fs.n_basis], synapse=0.1)
    nengo.Connection(ens2, plot[fs.n_basis:], synapse=0.1)

    dp = nengo.Ensemble(n_neurons=500, dimensions=1)
    def dotproduct(x):
        p = fs.reconstruct(x[:fs.n_basis])
        q = fs.reconstruct(x[fs.n_basis:])
        norm_p = np.linalg.norm(p)
        norm_q = np.linalg.norm(q)
        p = p/norm_p if norm_p != 0 else p
        q = q/norm_q if norm_q != 0 else q
        return np.dot(p,q)

    nengo.Connection(ens3, dp, function=dotproduct)

