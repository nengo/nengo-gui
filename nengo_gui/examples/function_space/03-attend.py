import nengo
import nengo.utils.function_space
import numpy as np

nengo.dists.Function = nengo.utils.function_space.Function
nengo.FunctionSpace = nengo.utils.function_space.FunctionSpace

import numpy as np


domain = np.linspace(-1, 1, 200)

def gaussian(mag, mean, sd):
    return mag * np.exp(-(domain-mean)**2/(2*sd**2))


# build the function space
fs = nengo.FunctionSpace(nengo.dists.Function(gaussian,
                                              mean=nengo.dists.Uniform(-1, 1),
                                              sd=nengo.dists.Uniform(0.1, 0.7),
                                              mag=1), 
                         n_basis=10)


model = nengo.Network()
with model:
    ens = nengo.Ensemble(n_neurons=500, dimensions=fs.n_basis)
    choice = nengo.Ensemble(n_neurons=1000, dimensions=fs.n_basis, radius=2)
    ens.encoders = fs.project(nengo.dists.Function(gaussian,
                    mean=nengo.dists.Uniform(-1, 1),
                    sd=0.05, mag=1))
    ens.eval_points = fs.project(nengo.dists.Function(gaussian,
                       mean=nengo.dists.Uniform(-1, 1),
                       sd=nengo.dists.Uniform(0.1, 0.3),
                       mag = nengo.dists.Uniform(0, 1),
                       superimpose=4))
    choice.encoders = fs.project(nengo.dists.Function(gaussian,
                    mean=nengo.dists.Uniform(-1, 1),
                    sd=0.05, mag=1))
    choice.eval_points = fs.project(nengo.dists.Function(gaussian,
                       mean=nengo.dists.Uniform(-1, 1),
                       sd=nengo.dists.Uniform(0.1, 0.1),
                       mag = nengo.dists.Uniform(-1, 1),
                       superimpose=4))
    
    n_stims = 3
    
    for i in range(n_stims):
        stimulus = fs.make_stimulus_node(gaussian, 3)
        stimulus.label = 'stim%d' % i
        nengo.Connection(stimulus, ens)
        stim_control = nengo.Node([0, 0, 0.2], label='stim_control %d' % i)
        nengo.Connection(stim_control, stimulus)
    
    plot = fs.make_plot_node(domain, lines=2)
        
    nengo.Connection(ens, plot[:fs.n_basis], synapse=0.1)


    def collapse(x):
        pts = fs.reconstruct(x)
        peak = np.argmax(pts)
        data = fs.project(gaussian(mag=1, sd=0.2, mean=domain[peak])*2-1)
        return data

    nengo.Connection(ens, choice)
    
    nengo.Connection(choice, choice, function=collapse)
    

    nengo.Connection(choice, plot[fs.n_basis:], synapse=0.1)
    

