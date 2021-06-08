import nengo
import numpy as np

model = nengo.Network()
with model:
    stimulus = nengo.Node(lambda t: (np.sin(t), np.cos(t)))
    ens = nengo.Ensemble(n_neurons=1000, dimensions=2)
    nengo.Connection(stimulus, ens)

if __name__ == "__main__":
    import nengo_gui

    nengo_gui.GUI(__file__).start()
