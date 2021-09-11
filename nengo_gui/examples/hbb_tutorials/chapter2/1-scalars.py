# Representing a scalar

# You can construct and manipulate a population of neurons (ensemble) in nengo.
# This model shows how the activity of neural populations can be thought
# of as representing a mathematical variable (a scalar value).

# The model has paramenters as described in the book and uses a single
# population (ensemble) of 100 LIF neurons. Note that the default max rates
# in Nengo 2.0 are (200, 400), so you have to explicitly specify them to be
# (100, 200) to create the model with the same parameters as described in the
# book. Moreover the 'Node Factory' feature of ensembles mentioned in the book
# maps to the 'neuron_type' in Nengo 2.0 which is set to LIF by default. The
# default values of tauRC, tauRef, radius and intercepts in Nengo 2.0 are the
# same as those mentioned in the book.

# Press the play button to run the simulation.
# The graph on the top left shows the input and the graph on the top right
# shows the the decoded value of the neural spiking (a linearly decoded estimate
# of the input). The graph on the bottom right shows the spike raster which is
# the spiking output of the neuron population (x).

import nengo

# Setup the environment
import numpy as np
from nengo.dists import Uniform

# Create the network object to which we can add ensembles, connections, etc.
model = nengo.Network(label="Many Neurons")

with model:
    # Input sine wave with range 1, freq of 16 rad/s
    stim = nengo.Node(lambda t: np.sin(16 * t), label="input")

    # Input sine wave with range increased to 4
    # stim = nengo.Node(lambda t: 4 * np.sin(16 * t), label="input")

    # Ensemble with 100 LIF neurons
    x = nengo.Ensemble(100, dimensions=1, max_rates=Uniform(100, 200))

    # Connecting input to ensemble
    nengo.Connection(stim, x)


# Increasing the range of Input

# You have seen that the population of neurons does a reasonably good job of
# representing the input. However, neurons cannot represent arbitrary values
# well and you can verify this by increasing the range of the input to 4
# ( input = nengo.Node(lambda t: 4 * np.sin(16 t)) ). You will observe the same
# saturation effects as described in the book, showing that the neurons do a
# much better job at representing information within the defined radius.
