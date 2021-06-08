import nengo
import numpy as np

model = nengo.Network()
with model:
    stimulus_A = nengo.Node([1], label="stim A")
    stimulus_B = nengo.Node(lambda t: np.sin(2 * np.pi * t))
    ens = nengo.Ensemble(n_neurons=1000, dimensions=2)
    result = nengo.Ensemble(n_neurons=50, dimensions=1)
    nengo.Connection(stimulus_A, ens[0])
    nengo.Connection(stimulus_B, ens[1])
    nengo.Connection(ens, result, function=lambda x: x[0] * x[1], synapse=0.01)

if __name__ == "__main__":
    import nengo_gui

    nengo_gui.GUI(__file__).start()
