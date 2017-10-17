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
