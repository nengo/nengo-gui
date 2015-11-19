********************
Development workflow
********************

Development happens on `Github <https://github.com/nengo/nengo_gui>`_.
Feel free to fork any of our repositories and send a pull request!
However, note that we ask contributors to sign
`a copyright assignment agreement <https://github.com/nengo/nengo_gui/blob/master/LICENSE.md>`_.

Code style: Python
==================

We adhere to
`PEP8 <http://www.python.org/dev/peps/pep-0008/#introduction>`_,
and use ``flake8`` to automatically check for adherence on all commits.

We use ``numpydoc`` and
`NumPy guidelines <https://github.com/numpy/numpy/blob/master/doc/HOWTO_DOCUMENT.rst.txt>`_
for docstrings, as they are a bit nicer to read in plain text,
and produce decent output with Sphinx.

Code style: JavaScript
======================

We adhere to a modified version of the Google style guide using 
`JSCS <http://jscs.info/>`_. Our custom rules for JSCS are saved in the
``jscs.json`` file in the root of this repository.

Unit testing
============

We use `PyTest <http://pytest.org/latest/>`_
to run our Python unit tests and `Mocha <https://mochajs.org/>`_ 
for JavaScript. Eventually these tests will run
on `Travis-CI <https://travis-ci.com/>`_. Please contribute unit tests
where possible.

Git
===

We use a pretty strict ``git`` workflow
to ensure that the history of the ``master`` branch
is clean and readable.
Every commit in the ``master`` branch should pass
unit testing, including PEP8.

Developers should never edit code on the ``master`` branch.
When changing code, create a new topic branch
that implements your new feature or fixes a bug.
When your branch is ready to be reviewed,
push it to Github and create a pull request.
One or more people will review your pull request,
and over one or many cycles of review,
your PR will be accepted or rejected.
We almost never reject PRs,
though we do let them languish in the limbo
of the PR queue if we're not sure
if they're quite ready yet.

Terry Stewart primarily repsonsible for reviewing your work,
and merging it into the ``master`` branch when it's been accepted.
He is the only person allowed to push to the ``master`` branch.

If you have any questions about our workflow,
or how you can best climb the learning curve
that Nengo GUI and ``git`` present, please contact
the development lead, `Sean <seanaubin@gmail.com>`_.