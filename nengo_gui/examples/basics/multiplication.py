# Nengo Example: Multiplication

# This example will show you how to multiply two values. The model
# architecture can be thought of as a combination of the combining demo and
# the squaring demo. Essentially, we project both inputs independently into a
# 2D space, and then decode a nonlinear transformation of that space (the
# product of the first and second vector elements).

import nengo

model = nengo.Network()
with model:
    # Create 4 ensembles of leaky integrate-and-fire neurons
    a = nengo.Ensemble(n_neurons=100, dimensions=1, radius=1)
    b = nengo.Ensemble(n_neurons=100, dimensions=1, radius=1)

    # Radius on this ensemble is ~sqrt(2)
    combined = nengo.Ensemble(n_neurons=200, dimensions=2, radius=1.5)

    prod = nengo.Ensemble(n_neurons=100, dimensions=1, radius=1)

    # These next two lines make all of the encoders in the Combined population
    # point at the corners of the cube. This improves the quality of the
    # computation.
    combined.encoders = nengo.dists.Choice([[1, 1], [-1, 1], [1, -1], [-1, -1]])

    stim_a = nengo.Node([0])
    stim_b = nengo.Node([0])

    # Connect the input nodes to the appropriate ensembles
    nengo.Connection(stim_a, a)
    nengo.Connection(stim_b, b)

    # Connect input ensembles A and B to the 2D combined ensemble
    nengo.Connection(a, combined[0])
    nengo.Connection(b, combined[1])

    # Define a function that computes the multiplication of two inputs
    def product(x):
        return x[0] * x[1]

    # Connect the combined ensemble to the output ensemble
    nengo.Connection(combined, prod, function=product)
