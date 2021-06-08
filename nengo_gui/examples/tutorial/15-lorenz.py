# Tutorial 15: The Lorenz Chaotic Attractor

# Differential equations can also give chaotic behaviour.  The classic example
# of this is the Lorenz "butterfly" attractor.  The equations for it are
#
# dx0/dt = sigma * (x1 - x0)
# dx1/dt = - x0 * x2 - x1
# dx2/dt = x0 * x1 - beta * (x2 + rho) - rho
#
# Note: this is a slight transformation from the standard formulation so
#  as to centre the value around the origin. For further information, see
#  http://compneuro.uwaterloo.ca/publications/eliasmith2005b.html
#  "Chris Eliasmith. A unified approach to building and controlling
#   spiking attractor networks. Neural computation, 7(6):1276-1314, 2005."

# Since there are three dimensions, we can show three different XY plots
# combining the different values in different ways.

import nengo

model = nengo.Network(seed=3)
with model:

    x = nengo.Ensemble(n_neurons=600, dimensions=3, radius=30)

    synapse = 0.1

    def lorenz(x):
        sigma = 10
        beta = 8.0 / 3
        rho = 28

        dx0 = -sigma * x[0] + sigma * x[1]
        dx1 = -x[0] * x[2] - x[1]
        dx2 = x[0] * x[1] - beta * (x[2] + rho) - rho

        return [dx0 * synapse + x[0], dx1 * synapse + x[1], dx2 * synapse + x[2]]

    nengo.Connection(x, x, synapse=synapse, function=lorenz)
