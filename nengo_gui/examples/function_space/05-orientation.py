import numpy as np

import nengo
import nengo.utils.function_space
reload(nengo.utils.function_space)

nengo.dists.Function = nengo.utils.function_space.Function
nengo.dists.Combined = nengo.utils.function_space.Combined
nengo.FunctionSpace = nengo.utils.function_space.FunctionSpace

domain = np.linspace(-1, 1, 200)


# define kinds of functions you'd like to represent
def gaussian(mag, mean, sd):
    return mag * np.exp(-(domain-mean)**2/(2*sd**2))

# build the function space, generate the basis functions
fs = nengo.FunctionSpace(
    nengo.dists.Function(
        gaussian,
        mean=nengo.dists.Uniform(-1, 1),
        sd=nengo.dists.Uniform(0.2, 0.2),
        mag=1),
    n_basis=10, n_samples=1000)

model = nengo.Network()
with model:

    # create an ensemble to represent the weights over the basis functions
    ens = nengo.Ensemble(n_neurons=2000, dimensions=fs.n_basis+1, radius=1.5,
            neuron_type=nengo.Direct())
    # create combined distribution, which uses both FunctionSpaceDistribution
    # and normal Nengo distributions across different dimensions
    ens.encoders = nengo.dists.Combined([
        fs.project(nengo.dists.Function(gaussian,
                                        mean=nengo.dists.Uniform(-1, 1),
                                        sd=nengo.dists.Uniform(0.2, 0.2),
                                        mag=1)),
        nengo.dists.UniformHypersphere(surface=True)],
        [fs.n_basis, 1],
        weights=[1, 1],
        normalize_weights=True)
    # train over the magnitude in the range 0-1 since no guarantee
    # input will be height 1
    ens.eval_points = nengo.dists.Combined([
        fs.project(nengo.dists.Function(gaussian,
                                        mean=nengo.dists.Uniform(-1, 1),
                                        sd=nengo.dists.Uniform(0.2, 0.2),
                                        mag=nengo.dists.Uniform(0, 1))),
        nengo.dists.UniformHypersphere(surface=False)],
        [fs.n_basis, 1],
        weights=[1, 1],
        normalize_weights=True)

    # create a network for input
    stimulus = fs.make_input([1, 0, 0.2])
    nengo.Connection(stimulus.output, ens[:-1])

    # the function for choosing the most salient stimulus and shifts it
    def collapse(x):
        # reconstruct the represented function from weights x
        pts = fs.reconstruct(x[:-1])
        # find the max value of the represented function
        peak = np.argmax(pts)
        # create a Gaussian centered at the peak
        data = gaussian(mag=1, sd=0.2, mean=domain[peak])

        shift = int(x[-1]*50)
        print(shift)

        data = fs.project(np.roll(data, shift))*1.1
        return data

    nengo.Connection(ens, ens[:-1], synapse=0.1, function=collapse)

    speed = nengo.Node([0])
    nengo.Connection(speed, ens[-1])

    spd = nengo.Ensemble(100, 1)
    nengo.Connection(ens[-1], spd)

    # create a node to give a plot of the represented function
    plot = fs.make_plot_node(domain=domain, lines=2, n_pts=50)
    nengo.Connection(ens[:-1], plot[:fs.n_basis], synapse=0.1)
    nengo.Connection(stimulus.output, plot[fs.n_basis:], synapse=0.1)
