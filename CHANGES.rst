***************
Release History
***************

.. Changelog entries should follow this format:

   version (release date)
   ======================

   **section**

   - One-line description of change (link to Github issue/PR)

.. Changes should be organized in one of several sections:

   - API changes
   - Improvements
   - Behavioural changes
   - Bugfixes
   - Documentation

0.5.0 (November 16, 2023)
=========================

*Compatible with Nengo 2.6.0 - 3.1.0*

- Made NengoGUI available under the GPLv2 license.

0.4.9 (May 24, 2022)
====================

*Compatible with Nengo 2.6.0 - 3.1.0*

- Improvement: Reworked How To Build a Brain examples to be more clear.
- Bugfix: Fix compatibility with Python version 3.10.

0.4.8 (June 9, 2021)
====================

*Compatible with Nengo 2.6.0 - 3.1.0*

- Bugfix: Fix compatibility with Nengo version 3.1.0.

0.4.7 (November 24, 2020)
=========================

*Compatible with Nengo 2.6.0 - 3.0.0*

- Bugfix: Restrict Nengo version to <=3.0.0.

0.4.6 (March 3, 2020)
=====================

*Compatible with Nengo 2.6.0 - 3.0.0*

- Bugfix: Fix examples for nengo 3.0 (those examples now require nengo>=2.6)
- Bugfix: Failure when opening browser from script

0.4.5 (November 19, 2019)
=========================

- Improvement: subclasses of Network use their class name as a default label
- Bugfix: Removed duplicate response headers (fixes loading in Chrome)
- Bugfix: Fix for running with Tornado 6
- Bugfix: Handle recent changes to nengo.Process API (backwards-compatible)

0.4.4 (June 9, 2019)
====================

- API change: Added backend to InlineGUI constructor.
- Improvement (Experimental): Added simulator hooks
- Improvement: Added audible spike sounds
- Improvement (Experimental): Nodes have access to the GUI keyboard state
- Improvement: support for nengo-bio Connections
- Improvement: show multiple connections between objects
- Bugfix: handle new Connection transform in Nengo 3.0.0
- Bugfix: escape labels so they aren't treated as HTML
- Improvement: reworked networking to allow clean integration with Jupyter

0.4.3 (June 28, 2018)
=====================

- Bugfix: thread-safety for jedi autocompletion
- Bugfix: Handle authentication when connecting to multiple servers
- Bugfix: Fail gracefully when binding server

0.4.2 (June 8, 2018)
====================

- Bugfix: Cloud plots for nengo_spa.Transcode plots no longer fail


0.4.1 (June 5, 2018)
====================

- Bugfix: File menu no longer has an incorrect height
- Bugfix: SPA plots for nengo_spa are now created correctly

0.4.0 (June 1, 2018)
====================

- Added build progress indicator
- Added status bar
- Pan view with CTRL/MMB
- Support for nengo_spa
- Added --browser option
- Added --unsecure option
- Fixed backspace not working on sliders, search box
- Added autocomplete to text editor
- Added visual depiction of modulatory and inhibitory connections
- Token-based authentication
- Dual-stack IPv4/IPv6 support

0.3.1 (October 17, 2017)
========================

- Improved some error messages.
- Fixed an issue with Safari compatibility.

0.3.0 (February 22, 2017)
=========================

This release is compatible with Nengo 2.1.0 and later.

- Added ability to set number of neurons in raster plots.
- Added ability to adjust synaptic filter on value plots.
- Rewritten server implementation for robustness and compatibility.
- Added tutorial files for "How to Build a Brain" book.
- Improved Selenium testing.
- Removed randomness in auto-layout algorithm.
- Better handling of messaging errors.
- Added red save icon indicator of a failed save.
- Added a "Help" link to https://forum.nengo.ai
- Removed seed changes due to creation of plots.

0.2.0 (April 28, 2016)
======================

This release is compatible with Nengo 2.1.0.

- The network graph can now be exported to SVG for inclusion in publications.
- Simulation data can now be exported to CSV for later analysis.
- The simulation will now automatically slow down to real time by default.
  The speed can be controlled with a new slider in the bottom left.
- Clicking on the file name allows you to save the model to a different file.
- Configuration now persists when the browser is closed and reopened.
- Value plots can now have a legend.
- Added a unit testing system.
- Optimized several parts of the code, which improved speed and responsiveness.
- Many other bug fixes and look-and-feel improvements.

0.1.5 (November 3, 2015)
========================

- Added a set of tutorials to the built-in examples.
- Added cross-hairs when hovering over plots.
- Added several new types of plots, including a firing pattern plot,
  a similarity plot for SPA networks, and a plot for ``Compare`` networks.
- Added the ability to implement custom HTML plots.
  See the built-in example ``basics/html.py``.
- Extended SPA override capabilities to all SPA networks.
- ``nengo_gui.Viz`` has been renamed to ``nengo_gui.GUI``.
- Major refactoring of back-end code.
- Many bug fixes and look-and-feel improvements.

0.1.4 (June 16, 2015)
=====================

- Spike rasters are now much faster.
- Added a reset button that restarts a simulation.
- Code editor now has a border, making it easier to resize.
- Can now search in the code editor (with Ctrl+f).
- When an error occurs in a model, a console will display with error details.
  Printed values also show up in this console, for easier debugging.
- Can now import from other files in the same directory as a Nengo model.
- Readonly files are handled safely, instead of crashing.
- Several minor aestheic improvements and bug fixes.

0.1.3 (June 10, 2015)
=====================

- Fixed another Python 3 compatibility issue with autolayouts.
- Fixed a bug that could cause a crash when reloading config files.

0.1.2 (June 9, 2015)
====================

- Fixed a Python 3 compatibility issue with semantic pointer graphs.

0.1.1 (June 8, 2015)
====================

- A large number of stability and user experience fixes.
  The first release was a bit buggy, but this should be pretty stable.
- Includes many more examples out of the box.

0.1.0 (June 5, 2015)
====================

Initial release of Nengo GUI!
Thanks to all of the contributors for making this possible!
