# #Nengo Example: Addition

# In this example, we will construct a network that adds two inputs. The
# network utilizes two communication channels into the same neural population.
# Addition is thus somewhat free, since the incoming currents from
# different synaptic connections interact linearly (though two inputs dont
# have to combine in this way: see the combining demo).

import nengo

model = nengo.Network()
with model:
    # Create 3 ensembles each containing 100 leaky integrate-and-fire neurons
    a = nengo.Ensemble(n_neurons=100, dimensions=1)
    b = nengo.Ensemble(n_neurons=100, dimensions=1)
    c = nengo.Ensemble(n_neurons=100, dimensions=1)

    # Create input nodes representing constant values
    stim_a = nengo.Node(0.5)
    stim_b = nengo.Node(0.3)

    # Connect the input nodes to the appropriate ensembles
    nengo.Connection(stim_a, a)
    nengo.Connection(stim_b, b)

    # Connect input ensembles a and b to output ensemble c
    nengo.Connection(a, c)
    nengo.Connection(b, c)
