# The Lorenz chaotic attractor
#
# This example shows the construction of a classic chaotic dynamical system:
# the Lorenz "butterfly" attractor.  The equations are:
#
# dx0/dt = sigma * (x1 - x0)
# dx1/dt = x0 * (rho - x2) - x1
# dx2/dt = x0 * x1 - beta * x2
#
# Since x2 is centered around approximately rho, and since NEF ensembles
# are usually optimized to represent values within a certain radius of the
# origin, we substitute x2' = x2 - rho, giving these equations:
#
# dx0/dt = sigma * (x1 - x0)
# dx1/dt = - x0 * x2' - x1
# dx2/dt = x0 * x1 - beta * (x2 + rho) - rho
#
# For more information, see
# http://compneuro.uwaterloo.ca/publications/eliasmith2005b.html
# "Chris Eliasmith. A unified approach to building and controlling
# spiking attractor networks. Neural computation, 7(6):1276-1314, 2005."

tau = 0.1
sigma = 10
beta = 8.0 / 3
rho = 28

import nengo


def feedback(x):
    dx0 = -sigma * x[0] + sigma * x[1]
    dx1 = -x[0] * x[2] - x[1]
    dx2 = x[0] * x[1] - beta * (x[2] + rho) - rho

    return [dx0 * tau + x[0], dx1 * tau + x[1], dx2 * tau + x[2]]


model = nengo.Network(seed=1)
with model:
    state = nengo.Ensemble(2000, 3, radius=30)
    nengo.Connection(state, state, function=feedback, synapse=tau)
