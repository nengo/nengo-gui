***************
Testing Guide
***************

Setup
============

Go over the getting started guide and make sure Nengo_gui is currently working
on your machine. Testing is currently only officially supported on Linux and
Mac.

To start testing locally:

Make sure you have a recent version of firefox. For mac users make sure firefox
is in the applications folder.

Open a terminal and navigate to the nengo_gui folder on your machine
for example, User/Git/nengo_gui/

### Linux:
    -$ sudo pip install -r requirements-test.txt

### Mac:
    -$ sudo pip install -r requirements-test.txt
    -$ sudo pip install -U pytest
    -$ sudo easy_install selenium

Both:
      At this point selenium and pytest should be installed.
      **Now Start up nengo_gui server in another terminal.**

Make sure to be in the nengo_gui folder, then run:
     -$ py.test

This will make sure everything has installed successfully. The console should
say some number of tests are found, firefox should pop up and it should
take a couple of minutes to run the base tests.

# Writing Tests

Look over nengo_gui/tests/test_example.py to learn how to write tests.

To create tests, simply save a file named 'test_whatever_the_test_concerns.py'
(e.g test_plot.py), save it to nengo_gui/tests.

# Additional Info

One last note, pytest will search for and run all test files in the current
directory and those below it. So when you run in from terminal make sure to be
in the appropriate folder e.g ."cd ./../nengo_gui/nengo_gui/tests"

documentation on python selenium can be found here
http://selenium-python.readthedocs.org/ and documentation on pytest can be
found here http://pytest.org/latest/.
