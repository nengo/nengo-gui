***************
Getting started
***************

Installation
============

The simplest way to install is with ``pip``.

.. code:: bash

   pip install nengo_gui

Running Nengo GUI
=================

There are two ways to run Nengo GUI.
First, you can use it from the command line by running:

.. code:: shell

   nengo

If you specify a file, the GUI will open that file:

.. code:: shell

   nengo myfile.py

Alternatively, you can start the GUI manually from within your code.
To do so, add to the bottom your Nengo script::

   import nengo_gui
   nengo_gui.GUI(__file__).start()

Basic usage
===========

The graph of the Nengo network should appear
when you start the GUI.
A rectangle is a `nengo.Node`,
a group of ellipses is a `nengo.Ensemble`,
and a rounded rectangle is a `nengo.Network`.

Items can be dragged to move them
and resized by dragging their edges or corners.

To start (or continue) the simulation,
click the play button in the lower right.
A spinning gear icon indicates that the model
is in the process of being built
(or re-built after new plots are added).

Right-clicking on an object will show a menu of options,
depending on what you have clicked on.
Here are some of the most useful options for objects:

- **Value**: Show a plot of the decoded output value over time.
- **XY-value**:
  Show a state-space plot of two decoded values against each other.
- **Spikes**: Show the spiking activity of a `nengo.Ensemble`.
- **Slider**: Show sliders to adjust the value in a `nengo.Node`.
- **Expand / collapse network**:
  Reveal or hide the insides of a `nengo.Network`.

Once you have plots,
you can also right-click on them to adjust their options.
For example:

- **Set range**: Adjust the limits of the plot.
- **Show / hide label**: Whether to show the title at the top of the plot.
- **Remove**: Get rid of the plot.

Plots record their data from previous time steps.
You can show this previous data by dragging
the transparent area in the time axis at the bottom
(beside the play button).
