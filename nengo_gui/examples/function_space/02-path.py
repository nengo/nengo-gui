import nengo
import nengo.utils.function_space
reload(nengo.utils.function_space)

import numpy as np



# define your function
def gaussian(points, mean, sd):
    if sd == 0:
        return points*0
    return np.exp(-(points-mean)**2/(2*sd**2))

# build the function space
fs = nengo.utils.function_space.FunctionSpace(gaussian,
                   pts=np.linspace(-1, 1, 200),
                   n_samples=1000, n_basis=10,
                   mean=nengo.dists.Uniform(-1, 1),
                   sd=nengo.dists.Uniform(0.1, 0.7))

model = nengo.Network()
with model:
    ens = nengo.Ensemble(n_neurons=500, dimensions=fs.n_basis)
    fs.set_encoders(ens,
                    mean=nengo.dists.Uniform(-1, 1),
                    sd=0.05)
    fs.set_eval_points(ens, n_eval_points=1000,
                       mean=nengo.dists.Uniform(-1, 1),
                       sd=nengo.dists.Uniform(0.1, 0.5))

    stimulus = fs.make_stimulus_node()
    nengo.Connection(stimulus, ens)

    stim_control = nengo.Node([1, 0, 0.2])
    nengo.Connection(stim_control, stimulus)

    plot = fs.make_plot_node(lines=1, n_pts=50)

    nengo.Connection(ens, plot, synapse=0.1)

    value = nengo.Node([0])
    x = nengo.Ensemble(n_neurons=500, dimensions=1)
    nengo.Connection(value, x)

    product = nengo.networks.Product(n_neurons=100, dimensions=fs.n_basis)

    sv_size = (fs.S/fs.scale)[:fs.n_basis]

    max_basis = np.max(fs.basis*fs.scale)
    for i in range(fs.n_basis):
        def basis_fn(x, i=i):
            index = int(x[0]*100+100)
            if index > 199: index = 199
            if index < 0: index = 0
            return fs.basis[index][i]*fs.scale/max_basis
        nengo.Connection(x, product.B[i], function=basis_fn)
        nengo.Connection(ens[i], product.A[i], transform=1.0/sv_size[i])


    total = nengo.Ensemble(50, 1)

    nengo.Connection(product.output, total, transform=[sv_size*max_basis])
