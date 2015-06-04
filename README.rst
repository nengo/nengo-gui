*********
nengo_gui
*********

HTML5 interactive visualizer for `Nengo <https://github.com/nengo/nengo>`_.
This lets you see the structure of a Nengo model, plot spiking activity and
decoded representations, and adjust the inputs while the model is running.

Requirements
============

 - Python (tested with Python 2.7 and Python 3.4)
 - Nengo (which also requires NumPy)

Installation
============

To install the visualizers, you need to download and install the code in this
repository.  For most operating systems, here are the commands needed:

.. code:: shell

   git clone https://github.com/nengo/nengo_gui
   cd nengo_gui
   python setup.py develop --user
   cd ..


Running nengo_gui
=================

There are two ways to run nengo_gui.  First, you can use it from within the
existing `Nengo GUI <https://github.com/nengo/nengo_gui>`_.  Do this by
running nengo_gui and clicking on the graph icon in the top-right (the one
without the 'J' on it).

Alternatively, you can start nengo_gui manually from within your code.  To
do so, add this to the bottom of your file that defines your Nengo model.

.. code:: python

   if __name__ == '__main__':
       import nengo_gui
       nengo_gui.Viz(__file__).start()

Note that if you take this approach, you must name your model "model" and
you should not be creating a nengo.Simulator object yourself.

Basic usage
===========

The graph of the Nengo network should appear.  Rectangles are nengo.Nodes,
ellipses are nengo.Ensembles, and rounded rectangles are nengo.Networks.

Items can be dragged to move them and resized by dragging their edge or via
the scroll wheel.

To start (or continue) the simulation, click the play button in the lower
right.  A spinning gear icon indicates the model is in the process of being
built (or re-built after new graphs are added).

Clicking on an item will show a menu of options, depending on what you
have clicked on.  Here are some of the standard options for network items:

 - value:  show a graph of the decoded output value over time
 - xy-value: show a state-space plot of two decoded values against each other
 - spikes: show the spiking activity of the nengo.Ensemble
 - slider: show sliders that let you adjust the value in a nengo.Node
 - expand/collapse: reveal or hide the insides of a nengo.Network

Once you have graphs, you can also click on them to adjust their options.  For
example:

 - set range: adjust the limits of the graph
 - show label/hide label: whether to show the title at the top of the graph
 - remove: get rid of the graph

The graphs record their data from previous time steps.  You can show this
previous data by dragging the transparent area in the time axis at the
bottom (beside the play button).
