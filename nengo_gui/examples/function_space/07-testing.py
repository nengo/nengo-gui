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
n_basis = 15
gaussian_space =  nengo.dists.Function(gaussian, 
                                       mean=nengo.dists.Uniform(-1, 1),
                                       sd=nengo.dists.Uniform(0.01, 0.1),
                                       mag=nengo.dists.Uniform(-1, 1)) 
fs = nengo.FunctionSpace(gaussian_space, n_basis=n_basis)

model = nengo.Network()
model.config[nengo.Ensemble].neuron_type = nengo.Direct()
with model:

    ens = nengo.Ensemble(n_neurons=500, dimensions=fs.n_basis)
    fs.encoders = fs.project(nengo.dists.Function(gaussian,
                    mean=nengo.dists.Uniform(-1, 1),
                    sd=0.05,
                    mag=1))
    fs.eval_points = fs.project(nengo.dists.Function(gaussian,
                    mean=nengo.dists.Uniform(-1, 1),
                    sd=nengo.dists.Uniform(0.1, 0.5),
                    mag=1))
                    
    stimulus = fs.make_stimulus_node(gaussian, 3)
    nengo.Connection(stimulus, ens)
    
    stim_control = nengo.Node([1, 0, 0.2])
    nengo.Connection(stim_control, stimulus)
    
    plot = fs.make_plot_node(domain, lines=1, n_pts=50)
        
    nengo.Connection(ens, plot, synapse=0.1)

    value = nengo.Node([0])
    x = nengo.Ensemble(n_neurons=500, dimensions=1)
    nengo.Connection(value, x)
   

    calc_fx = nengo.Ensemble(n_neurons=500, dimensions=fs.n_basis+1,
            radius=10,)# neuron_type=nengo.LIF())
    nengo.Connection(x, calc_fx[0])
    nengo.Connection(ens, calc_fx[1:])

    fx = nengo.Ensemble(n_neurons=1, dimensions=1,
            neuron_type=nengo.Direct())
    def sample(x):
        weights = x[1:]
        x = x[0]
        index = min(max(0, int(x*n_samples/2 + n_samples/2)), n_samples-1)
        fx = 0
        for ii in range(fs.n_basis):
            fx += fs.basis[index][ii]*weights[ii]
        return fx
    nengo.Connection(calc_fx, fx, function=sample)

sim = nengo.Simulator(model)
sim.run(1)
