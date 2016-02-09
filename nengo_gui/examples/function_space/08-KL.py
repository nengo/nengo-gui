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


# build the function space
fs = nengo.FunctionSpace(nengo.dists.Function(gaussian,
                                              mean=nengo.dists.Uniform(-1, 1),
                                              sd=nengo.dists.Uniform(0.1, 0.7),
                                              mag=1), 
                         n_basis=5)

model = nengo.Network()
with model:
    ens1 = nengo.Ensemble(n_neurons=500, dimensions=fs.n_basis, 
            neuron_type=nengo.Direct())
    ens1.encoders = fs.project(nengo.dists.Function(gaussian,
                mean=nengo.dists.Uniform(-1, 1),
                sd=0.05,
                mag=1))
                
    ens1.eval_points = fs.project(nengo.dists.Function(gaussian,
                       mean=nengo.dists.Uniform(-1, 1),
                       sd=nengo.dists.Uniform(0.1, 0.5),
                       mag=1))
    
    stimulus1 = fs.make_stimulus_node(gaussian, 3)
    nengo.Connection(stimulus1, ens1)
    
    stim_control1 = nengo.Node([1, 0, 0.2])
    nengo.Connection(stim_control1, stimulus1)
    
    plot1 = fs.make_plot_node(domain=domain, lines=2)
    nengo.Connection(ens1, plot1[:fs.n_basis], synapse=0.1)
    nengo.Connection(stimulus1, plot1[fs.n_basis:], synapse=0.1)

    ens2 = nengo.Ensemble(n_neurons=500, dimensions=fs.n_basis, 
            neuron_type=nengo.Direct())
    ens2.encoders = fs.project(nengo.dists.Function(gaussian,
                mean=nengo.dists.Uniform(-1, 1),
                sd=0.05,
                mag=1))
                
    ens2.eval_points = fs.project(nengo.dists.Function(gaussian,
                       mean=nengo.dists.Uniform(-1, 1),
                       sd=nengo.dists.Uniform(0.1, 0.5),
                       mag=1))
    
    stimulus2 = fs.make_stimulus_node(gaussian, 3)
    nengo.Connection(stimulus2, ens2)
    
    stim_control2 = nengo.Node([1, 0, 0.2])
    nengo.Connection(stim_control2, stimulus2)
    
    plot2 = fs.make_plot_node(domain=domain, lines=2)
    nengo.Connection(ens2, plot2[:fs.n_basis], synapse=0.1)
    nengo.Connection(stimulus2, plot2[fs.n_basis:], synapse=0.1)

    ens3 = nengo.Ensemble(n_neurons=1500, dimensions=fs.n_basis*2, radius=2,)
        # neuron_type=nengo.Direct())
    nengo.Connection(ens1, ens3[:fs.n_basis])
    nengo.Connection(ens2, ens3[fs.n_basis:])

    KLdiv = nengo.Ensemble(n_neurons=500, dimensions=1)
    def KL(x):
        import scipy as  sp
        p = fs.reconstruct(x[:fs.n_basis])
        q = fs.reconstruct(x[fs.n_basis:])
        return np.dot(p,q)
        # total = 0.0
        # for pi,qi in zip(p,q):
        #     if qi > 0: total += pi / qi
        # #pq = np.where(q!=0, p / q, 0)
        # return total
        #return np.sum(np.where(p != 0, p * np.log(np.where(pq>0, pq, 0)), 0))

    nengo.Connection(ens3, KLdiv, function=KL)

