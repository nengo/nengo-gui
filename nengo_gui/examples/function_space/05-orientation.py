import nengo
import nengo.utils.function_space
reload(nengo.utils.function_space)

nengo.dists.Function = nengo.utils.function_space.Function
nengo.dists.Combined = nengo.utils.function_space.Combined
nengo.FunctionSpace = nengo.utils.function_space.FunctionSpace


import numpy as np


domain = np.linspace(-1, 1, 200)

# define your function
def gaussian(mag, mean, sd):
    return mag * np.exp(-(domain-mean)**2/(2*sd**2))



# build the function space
fs = nengo.FunctionSpace(nengo.dists.Function(gaussian,
                                              mean=nengo.dists.Uniform(-1, 1),
                                              sd=nengo.dists.Uniform(0.2, 0.2),
                                              mag=1), 
                         n_basis=10, n_samples=1000)

model = nengo.Network()
with model:
    ens = nengo.Ensemble(n_neurons=2000, dimensions=fs.n_basis+1, radius=1.5)
    ens.encoders = nengo.dists.Combined([fs.project(nengo.dists.Function(gaussian,
                mean=nengo.dists.Uniform(-1, 1),
                sd=nengo.dists.Uniform(0.2, 0.2),
                mag=1)), nengo.dists.UniformHypersphere(surface=True)],
                [fs.n_basis, 1], weights=[1,1], normalize_weights=True)
                
    ens.eval_points = nengo.dists.Combined([fs.project(nengo.dists.Function(gaussian,
                       mean=nengo.dists.Uniform(-1, 1),
                       sd=nengo.dists.Uniform(0.2, 0.2),
                       mag=nengo.dists.Uniform(0, 1))),
                       nengo.dists.UniformHypersphere(surface=False)], 
                       [fs.n_basis, 1], weights=[1,1], normalize_weights=True)
    
    stimulus = fs.make_stimulus_node(gaussian, 3)
    nengo.Connection(stimulus, ens[:-1])
    
    stim_control = nengo.Node([1, 0, 0.2])
    nengo.Connection(stim_control, stimulus)
    
    plot = fs.make_plot_node(domain=domain, lines=2, n_pts=50)
        
    nengo.Connection(ens[:-1], plot[:fs.n_basis], synapse=0.1)
    nengo.Connection(stimulus, plot[fs.n_basis:], synapse=0.1)
    
    def collapse(x):
        pts = fs.reconstruct(x[:-1])
        peak = np.argmax(pts)
        data = gaussian(mag=1, sd=0.2, mean=domain[peak])
        
        shift = int(x[-1]*50)
        
        data = fs.project(np.roll(data, shift))*1.1
        return data

    nengo.Connection(ens, ens[:-1], synapse=0.1, function=collapse)



    speed = nengo.Node([0])
    nengo.Connection(speed, ens[-1])
    
    spd = nengo.Ensemble(100, 1)
    nengo.Connection(ens[-1], spd)