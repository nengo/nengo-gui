# Nengo Example: Controlled Oscillator
#
# The controlled oscillator is an oscillator with an extra input that controls
# the frequency of the oscillation.

import nengo

tau = 0.1  # Post-synaptic time constant for feedback
w_max = 10  # Maximum frequency is w_max/(2*pi)

model = nengo.Network()
with model:
    # The ensemble for the oscillator
    oscillator = nengo.Ensemble(500, dimensions=3, radius=1.7)

    # The feedback connection
    def feedback(x):
        x0, x1, w = x  # These are the three variables stored in the ensemble
        return x0 + w * w_max * tau * x1, x1 - w * w_max * tau * x0, 0

    nengo.Connection(oscillator, oscillator, function=feedback, synapse=tau)

    # The ensemble for controlling the speed of oscillation
    frequency = nengo.Ensemble(100, dimensions=1)

    nengo.Connection(frequency, oscillator[2])

    # We need a quick input at the beginning to start the oscillator
    initial_stim = nengo.Node(lambda t: 1 if t < 0.15 else 0)
    nengo.Connection(initial_stim, oscillator[0])

    # Vary the speed over time
    stim_frequency = nengo.Node([1])

    nengo.Connection(stim_frequency, frequency)
