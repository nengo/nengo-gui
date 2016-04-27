*********
Nengo GUI
*********

Nengo GUI is an HTML5-based interactive visualizer for
large-scale neural models created with
`Nengo <https://github.com/nengo/nengo>`_.
The GUI lets you see the structure of a Nengo model,
plots spiking activity and decoded representations,
and enables you to alter inputs
in real time while the model is running.

Requirements
============

- Python (tested with Python 2.7 and Python 3.4+)
- Nengo (which requires NumPy)

Installation
============

The simplest way to install is with the standard Python installation system:

.. code:: shell

   pip install nengo_gui

Running Nengo GUI
=================

Nengo GUI is accessed through a web browser
(Google Chrome, Firefox, Safari, etc.)
To access the correct webpage,
you must first start the Nengo GUI server.
To do this, open a command line window and run:

.. code:: shell

   nengo

If you specify a file, it will be loaded:

.. code:: shell

   nengo myfile.py

Alternatively, you can start the GUI manually from within your code. To
do so, add this to the bottom of your file that defines your Nengo model.

.. code:: python

   import nengo_gui
   nengo_gui.GUI(__file__).start()

Basic usage
===========

The graph of the Nengo network should appear. Rectangles are nodes,
sets of 5 circles are ensembles, and rounded rectangles are networks.

Items can be dragged to move them and resized by dragging their edge or via
the scroll wheel.

To start (or continue) the simulation, click the play button in the lower
right. A spinning gear icon indicates the model is in the process of being
built (or re-built after new graphs are added).

Clicking on an item will show a menu of options, depending on what you
have clicked on. Here are some of the standard options for network items:

- value: show a graph of the decoded output value over time
- xy-value: show a state-space plot of two decoded values against each other
- spikes: show the spiking activity of the nengo.Ensemble
- slider: show sliders that let you adjust the value in a nengo.Node
- expand/collapse: reveal or hide the insides of a nengo.Network

Once you have graphs, you can also click on them to adjust their options. For
example:

- set range: adjust the limits of the graph
- show label/hide label: whether to show the title at the top of the graph
- remove: get rid of the graph

The graphs record their data from previous time steps. You can show this
previous data by dragging the transparent area in the time axis at the
bottom (beside the play button).

Contributing
============

We welcome contributions to Nengo GUI through issues and pull requests!
However, we require contributor assignment agreements
before pull requests are merged.
See the ``CONTRIBUTORS.rst`` and ``LICENSE.rst`` files for more information.

Developer installation
----------------------

Developers should install Nengo GUI like so:

.. code:: shell

   git clone https://github.com/nengo/nengo_gui
   cd nengo_gui
   python setup.py develop --user

Changes to the files in the ``nengo_gui`` directory will be
reflected the next time the GUI is run or imported.

Running unit tests
------------------

Testing is done with the help of `Selenium <http://www.seleniumhq.org/>`_.
Testing is currently only supported on Linux and Mac OS X.

To run the tests, make sure you have a recent version of Firefox.
Mac users should ensure that Firefox is in the applications folder.

Additional dependencies are required for running unit tests.
To install them, open a terminal and navigate to the ``nengo_gui`` folder.
Execute the command

.. code:: shell

   pip install --user -r requirements-test.txt

If you are using a virtual environment,
you can omit the ``--user`` flag.

At this point selenium and pytest should be installed,
so you are ready to run the tests.

To run the tests:

1. Open a terminal window and start the ``nengo`` server.
2. Open a second terminal window.
3. Navigate to the ``nengo_gui`` directory.
4. Run ``py.test``.

The console should say some number of tests are found,
and Firefox will launch and start doing things on its own.
It may takes a few minutes to run all tests.

Writing new unit tests
----------------------

To create tests, simply save a file named
``test_whatever_the_test_concerns.py`` in ``nengo_gui/tests``
See ``nengo_gui/tests/test_example.py`` for examples tests.

The following references may also be helpful.

- `Selenium-Python documentation <http://selenium-python.readthedocs.org/>`_
- `pytest documentation <http://pytest.org/latest/>`_
