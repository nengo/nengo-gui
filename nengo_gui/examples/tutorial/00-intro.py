# Tutorial 0: Welcome to Nengo

# Nengo <http://nengo.ca> is a tool for creating large-scale biologically
# realistic neural models.  It was developed by the Centre for Theoretical
# Neuroscience at the University of Waterloo and the affiliated spin-off
# company Applied Brain Research.  It has been used to create Spaun, the
# first simulated brain that is capable of performing tasks.

# This sequence of tutorials takes you through the various features of Nengo.
#
# You can go to the next tutorial by clicking on the "Open file" icon in the
# top-left of the screen and selecting the next one.
#
# The Nengo interface shows the script that defines the model here on the
# right side of the screen, and a graphical depiction of the model on the left
# side.
#
# If you press the "Play" button (bottom-right), the simulation will start.
# You can move the slider to adjust the input to the neurons and see the
# spiking activity of the neurons change.  You can also see the value that
# can be decoded from that spiking activity change as the neurons try to
# represent whatever value you are inputting.

import nengo

model = nengo.Network()
with model:
    stim = nengo.Node(0)
    ens = nengo.Ensemble(n_neurons=50, dimensions=1)
    nengo.Connection(stim, ens)
