import nengo
import numpy as np

D = 9
cols = int(np.sqrt(D))
size = 150

model = nengo.Network()
with model:
    for i in range(D):

        def waves(t, i=i):
            return np.sin(t + np.arange(i + 1) * 2 * np.pi / (i + 1))

        node = nengo.Node(waves)

if __name__ == "__main__":
    import nengo_gui

    nengo_gui.GUI(__file__).start()
