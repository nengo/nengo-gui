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
download it from github:

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

Testing
============

Make sure Nengo_gui is currently working on your machine. Testing is currently
only officially supported on Linux and Mac.

To start testing locally:

Make sure you have a recent version of firefox. For mac users make sure firefox
is in the applications folder.

Open a terminal and navigate to the nengo_gui folder on your machine
for example, User/Git/nengo_gui/

**Linux**:

.. code:: shell

    sudo pip install -r requirements-test.txt

**Mac**:

.. code:: shell

    sudo pip install -r requirements-test.txt
    sudo pip install -U pytest
    sudo easy_install selenium

Both:
      At this point selenium and pytest should be installed.
      **Now Start up nengo_gui server in another terminal.**

Make sure to be in the nengo_gui folder, then run:

.. code:: shell

    py.test

This will make sure everything has installed successfully. The console should
say some number of tests are found, firefox should pop up and it should
take a couple of minutes to run the base tests.

**Writing Tests**

Look over nengo_gui/tests/test_example.py to learn how to write tests.

To create tests, simply save a file named 'test_whatever_the_test_concerns.py'
(e.g test_plot.py), save it to nengo_gui/tests.

**Additional Info**

Pytest will search for and run all test files in the current
directory and those below it. So when you run in from terminal make sure to be
in the appropriate folder e.g ."cd ./../nengo_gui/nengo_gui/tests"

documentation on python selenium can be found here
http://selenium-python.readthedocs.org/ and documentation on pytest can be
found here http://pytest.org/latest/.
