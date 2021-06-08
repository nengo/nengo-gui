# Nengo Example: Squaring the Input

# This demo shows you how to construct a network that squares the value
# encoded in a first population in the output of a second population.

# Create the model object
import nengo

model = nengo.Network()
with model:
    # Create two ensembles of 100 leaky-integrate-and-fire neurons
    a = nengo.Ensemble(n_neurons=100, dimensions=1)
    b = nengo.Ensemble(n_neurons=100, dimensions=1)

    # Create an input node
    stim = nengo.Node([0])

    # Connect the input node to ensemble A
    nengo.Connection(stim, a)

    # Define the squaring function
    def square(x):
        return x[0] * x[0]

    # Connection ensemble a to ensemble b
    nengo.Connection(a, b, function=square)
