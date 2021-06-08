# Tutorial 17: Neuron Models

# Nengo supports multiple different types of neurons.  The default is the
# "Leaky Integrate-and-Fire" or LIF neuron.  Other supported ones are shown
# here.  The LIFRate neuron acts like the LIF neuron, but does not have spikes.
# The Sigmoid is a standard model used in machine learning.  The
# RectifiedLinear model simply outputs the absolute value of its input (the
# simplest possible neuron-like operation).  The most complex neuron model
# here is the Izhikevich neuron, which has four parameters to adjust and
# has been shown to map very closely to a large number of real biological
# neurons.

import nengo

model = nengo.Network()
with model:

    stim = nengo.Node(0)

    a = nengo.Ensemble(
        n_neurons=50, dimensions=1, neuron_type=nengo.LIF(tau_rc=0.02, tau_ref=0.002)
    )

    b = nengo.Ensemble(
        n_neurons=50,
        dimensions=1,
        neuron_type=nengo.LIFRate(tau_rc=0.02, tau_ref=0.002),
    )

    c = nengo.Ensemble(
        n_neurons=50,
        dimensions=1,
        neuron_type=nengo.Sigmoid(tau_ref=0.002),
        max_rates=nengo.dists.Uniform(250.0, 400.0),
    )

    d = nengo.Ensemble(n_neurons=50, dimensions=1, neuron_type=nengo.RectifiedLinear())

    e = nengo.Ensemble(
        n_neurons=50,
        dimensions=1,
        neuron_type=nengo.Izhikevich(
            tau_recovery=0.02, coupling=0.2, reset_voltage=-65, reset_recovery=8
        ),
    )

    nengo.Connection(stim, a)
    nengo.Connection(stim, b)
    nengo.Connection(stim, c)
    nengo.Connection(stim, d)
    nengo.Connection(stim, e)
