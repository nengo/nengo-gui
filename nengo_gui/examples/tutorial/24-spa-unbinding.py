# Tutorial 24: Unbinding Concepts

# Now that we can combine information together into a single structure (see
# the previous tutorial), we also need to be able to extract information
# back out.  We do this by exploiting a pseudo-inverse property of the
# binding operation.  In particular, A*B*~B is approximately the same as A,
# where ~ means to take the pseudo-inverse of a vector by rearranging its
# elements (in particular, A*~B is the circular correlation of A and B).
#
# Using this approach, we can store bound information in memory and then
# query that memory to ask questions.  For this tutorial, we use shape and
# color as inputs exactly as in the previous tutorial.  Start by feeding in
# TRIANGLE and BLUE until the memory contains BLUE*TRIANGLE.  Now feed in
# CIRCLE and RED until the memory also contains RED*CIRCLE (this is the same
# as in the previous tutorial).  Now take away those inputs by setting the
# values of shape and color to nothing.
#
# Once the memory is set up in this way, we can query the memory by presenting
# inputs to the query population.  If you put in a query of RED you should
# get an answer of CIRCLE.  For CIRCLE you should get RED.  For BLUE you should
# get TRIANGLE.  And for TRIANGLE you should get BLUE.  Notice that the memory
# will gradually decay and fade the longer you try to run the system for.

import nengo
import nengo.spa as spa

D = 32  # the dimensionality of the vectors

model = spa.SPA()
with model:
    model.color = spa.State(D)
    model.shape = spa.State(D)
    model.memory = spa.State(D, feedback=1)
    model.query = spa.State(D)
    model.answer = spa.State(D)

    actions = spa.Actions(
        "memory = color * shape",
        "answer = memory * ~query",
    )

    model.cortical = spa.Cortical(actions)
