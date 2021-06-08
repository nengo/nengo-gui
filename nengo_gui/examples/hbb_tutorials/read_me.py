# The simulations in these folders reproduce the tutorials from the book
# How to Build a Brain (Eliasmith, 2013, Oxford).  The original tutorials
# were written for Nengo 1.4.  The examples in these folders provide the final
# models for each of the tutorials in the relevant chapters, but implemented
# in Nengo 2.0.
#
# You can follow the general form of each tutorial from the book,
# but there are significant differences in how models are built between Nengo
# versions.  The comment text in these simulation files describes those
# differences as they relate to each example tutorial.  Consequently, you can
# just look at these files for all the information in the tutorials (except
# these files don't walk you through model construction).

import nengo

model = nengo.Network()
