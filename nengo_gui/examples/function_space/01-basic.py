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
                         n_basis=10)

model = nengo.Network()
with model:
    ens = nengo.Ensemble(n_neurons=500, dimensions=fs.n_basis)
    ens.encoders = fs.project(nengo.dists.Function(gaussian,
                mean=nengo.dists.Uniform(-1, 1),
                sd=0.05,
                mag=1))

    ens.eval_points = fs.project(nengo.dists.Function(gaussian,
                       mean=nengo.dists.Uniform(-1, 1),
                       sd=nengo.dists.Uniform(0.1, 0.5),
                       mag=1))

    stimulus = fs.make_stimulus_node(gaussian, 3)
    nengo.Connection(stimulus, ens)

    stim_control = nengo.Node([1, 0, 0.2])
    nengo.Connection(stim_control, stimulus)

    plot = fs.make_plot_node(domain=domain, lines=2)

    nengo.Connection(ens, plot[:fs.n_basis], synapse=0.1)
    nengo.Connection(stimulus, plot[fs.n_basis:], synapse=0.1)

sim = nengo.Simulator(model)
sim.run(1)
