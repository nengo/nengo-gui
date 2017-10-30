***********************
Vendorized dependencies
***********************

This directory contains Nengo GUI dependencies
that have been vendorized.
A vendorized dependency is shipped with Nengo GUI
to allow for easy offline install.

To add a new vendorized dependency,
add it to ``nengo_gui/_vendor/requirements.txt`` and run

.. code:: bash

   pip install --target nengo_gui/_vendor -r nengo_gui/_vendor/requirements.txt

from the Nengo GUI root directory.

To update a vendorized dependency,
change the version number associated with that package
in ``nengo_gui/_vendor/requirements.txt``
and rerun the above command
from the Nengo root directory.
