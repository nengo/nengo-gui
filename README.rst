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

The simplest way to install is with the standard Python installation system:

.. code:: shell

   pip install nengo_gui

If you would like access the the development version of nengo_gui, you can
download it from guthub:

.. code:: shell

   git clone https://github.com/nengo/nengo_gui
   cd nengo_gui
   python setup.py develop --user


Running nengo_gui
=================

There are two ways to run nengo_gui.  First, you can use it from the command
line by running the installed script:

.. code:: shell

   nengo_gui

If you specify a file to load, nengo_gui will do so:

.. code:: shell

   nengo_gui myfile.py

Alternatively, you can start nengo_gui manually from within your code.  To
do so, add this to the bottom of your file that defines your Nengo model.

.. code:: python

   import nengo_gui
   nengo_gui.GUI(__file__).start()


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
