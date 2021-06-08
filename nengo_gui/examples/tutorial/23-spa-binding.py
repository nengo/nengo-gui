# Tutorial 23: Binding Concepts

# We now show that you can combine semantic pointers together to store
# structured information.  One of the standard problems in cognitive science
# is the Binding Problem: how do different concepts get represented and
# associated together.  For example, if I think about a red circle and and
# a blue triangle, how does my mind connect RED to CIRCLE and BLUE to TRIANGLE,
# and how does it keep those separate?  Notice that we can't simply add
# RED + CIRCLE + BLUE + TRIANGLE since that would give the same result as
# RED + TRIANGLE + BLUE + CIRCLE, meaning that we couldn't distinguish
# "red circle and blue triangle" from "red triangle and blue circle".
#
# With the semantic pointer approach, we solve this problem by using the
# mathematical operation of circular convolution.  Like addition, this
# operation combines two vectors into a new vector.  However, unlike addition,
# this new vector is very different from both of the original vectors.  (Note
# that this operation was first explored for this purpose by Tony Plate's in
# his Holographic Reduced Representations: "Tony A. Plate. Holographic Reduced
# Representations. IEEE Transactions on Neural Networks, (6):3:623-641, 1995")
# If we use "*" to indicate circular convolution, then we can solve the above
# problem by storing RED * CIRCLE + BLUE * TRIANGLE
#
# Since circular convolution can be implemented with multiplication and linear
# transformation, neurons can readily implement this operation.  In this
# tutorial, we have two inputs (shape and color) and whatever vector is
# stored in these inputs will be convolved together and fed into a memory.
# This is realised by the spa.Cortical module, which directs the flow of
# actions in the cortex.
#
# Try setting the color to RED and the State to CIRCLE.  The memory should
# gradually build up to contain RED*CIRCLE (or, equivalently, CIRCLE*RED).  Now
# clear the inputs (by doing Set value and leaving them blank).  The memory
# should continue ot hold RED*CIRCLE.  Now set the inputs to BLUE and TRIANGLE.
# The memory should gradually change so that it also contains BLUE*TRIANGLE. If
# you feed in these new inputs for a long time, the old RED*CIRCLE memory will
# eventually disappear.  However, if you clear the value being input when both
# values are in memory, it should maintain both bound concepts in memory at the
# same time.
#
# As with all semantic pointer models, the accuracy and capacity of this memory
# will increase as you increase dimensionality (but the simulation will take
# longer to run).  We have argued that around 800 dimensions are sufficient for
# human working memory capacity.

import nengo
import nengo.spa as spa

D = 32  # the dimensionality of the vectors

model = spa.SPA()
with model:
    model.color = spa.State(D)
    model.shape = spa.State(D)
    model.memory = spa.State(D, feedback=1)

    actions = spa.Actions(
        "memory = color * shape",
    )

    model.cortical = spa.Cortical(actions)
