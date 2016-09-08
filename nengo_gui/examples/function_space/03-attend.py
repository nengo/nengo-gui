import numpy as np

import nengo
import nengo.utils.function_space
reload(nengo.utils.function_space)

nengo.dists.Function = nengo.utils.function_space.Function
nengo.FunctionSpace = nengo.utils.function_space.FunctionSpace

domain = np.linspace(-1, 1, 200)


# define kinds of functions you'd like to represent
def gaussian(mag, mean, sd):
    return mag * np.exp(-(domain-mean)**2/(2*sd**2))

# build the function space
fs = nengo.FunctionSpace(
    nengo.dists.Function(
        gaussian,
        mean=nengo.dists.Uniform(-1, 1),
        sd=nengo.dists.Uniform(0.1, 0.7),
        mag=1),
    n_basis=10)

model = nengo.Network()
with model:
    # an ensemble to represent the weights over the basis functions
    ens = nengo.Ensemble(n_neurons=500, dimensions=fs.n_basis)
    # this time we're using separate distributions for the encoders
    # and the evaluation points. TODO: why?
    ens.encoders = fs.project(
        nengo.dists.Function(gaussian,
                             mean=nengo.dists.Uniform(-1, 1),
                             sd=0.05, mag=1))
    ens.eval_points = fs.project(
        nengo.dists.Function(gaussian,
                             mean=nengo.dists.Uniform(-1, 1),
                             sd=nengo.dists.Uniform(0.1, 0.3),
                             mag=nengo.dists.Uniform(0, 1),
                             superimpose=4))

    # this population will find the salient points in the input
    choice = nengo.Ensemble(n_neurons=1000, dimensions=fs.n_basis, radius=2)
    choice.encoders = fs.project(
        nengo.dists.Function(gaussian,
                             mean=nengo.dists.Uniform(-1, 1),
                             sd=0.05, mag=1))
    choice.eval_points = fs.project(
        nengo.dists.Function(gaussian,
                             mean=nengo.dists.Uniform(-1, 1),
                             sd=nengo.dists.Uniform(0.1, 0.1),
                             mag=nengo.dists.Uniform(-1, 1),
                             superimpose=4))

    # number of different Gaussian stimuli, creating competing attention points
    n_stims = 3
    for ii in range(n_stims):
        stim = fs.make_input([0, 0, .2])
        stim.label = 'stim%i' % ii
        nengo.Connection(stim.output, ens)

    plot = fs.make_plot_node(domain, lines=2)
    nengo.Connection(ens, plot[:fs.n_basis], synapse=0.1)

    # the function for choosing the most salient stimulus
    def collapse(x):
        # reconstruct the represented function from weights x
        pts = fs.reconstruct(x)
        # find the max value of the represented function
        peak = np.argmax(pts)
        # output a set of weights for a Gaussian centered at the peak
        data = fs.project(gaussian(mag=1, sd=0.2, mean=domain[peak])*2-1)
        return data

    # project weights from all stimuli into choice
    nengo.Connection(ens, choice)
    # in a recurrent connection, bias the representation towards the
    # max value of the function represented in ens
    nengo.Connection(choice, choice, function=collapse)
    nengo.Connection(choice, plot[fs.n_basis:], synapse=0.1)
