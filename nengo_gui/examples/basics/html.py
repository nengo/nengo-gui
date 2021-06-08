# Creating Custom Displays

# This demonstrates using the special _nengo_html_ variable to create
# custom visualizations.  In general, this lets you take values from the model
# and use them to make HTML that displays something useful for your situation.
#
# The basic technique is that if you define a function for a Node, in addition
# to returning a value, you can also set the _nengo_html_ parameter on that
# function.  You can set it to any HTML you want, and that HTML will be
# displayed in a custom HTML graph (available by right-clicking on the Node).

# The first example is a timer function that says "Ready..." for the
# first second of the simulation, then says "Set..." for the next second,
# and then says "Go!".  This shows how you can change the HTML based on the
# time of the simulation.
#
# The second example shows that the custom HTML can also be based on the values
# represented by neurons.  Here, we make a Node that reads in a value that is
# treated as an amount.  If the value is above 0.5, the HTML says "large",
# if the value is below -0.5, it says "small", and otherwise it says "medium".
#
# Finally, the third example uses SVG and trigonometry to create a simple
# visualization of a two-joint arm.  The two values represented by the
# Ensemble are the two joint angles (the shoulder and the elbow).  From these
# values, the position of the elbow and hand are computed, and lines are
# drawn to show the arm.

import nengo
import numpy as np

model = nengo.Network()
with model:

    # Example 1: a timer
    def timer_function(t):
        if t < 1.0:
            timer_function._nengo_html_ = "<h1>Ready...</h1>"
            return 0
        elif t < 2.0:
            timer_function._nengo_html_ = "<h1>Set...</h1>"
            return 0
        else:
            timer_function._nengo_html_ = "<h1>Go!</h1>"
            return 1

    timer = nengo.Node(timer_function)

    # Example 2: displaying a value
    def amount_function(t, x):
        if x < -0.5:
            amount_function._nengo_html_ = "<h2>small</h2>"
        elif -0.5 < x < 0.5:
            amount_function._nengo_html_ = "<h2>medium</h2>"
        else:
            amount_function._nengo_html_ = "<h2>large</h2>"

    stim_amount = nengo.Node(0)
    amount = nengo.Ensemble(n_neurons=100, dimensions=1)
    display_amount = nengo.Node(amount_function, size_in=1)
    nengo.Connection(stim_amount, amount)
    nengo.Connection(amount, display_amount)

    # Example 3: a two-joint arm
    def arm_function(t, angles):
        len0 = 50
        len1 = 30
        x1 = 50
        y1 = 100
        x2 = x1 + len0 * np.sin(angles[0])
        y2 = y1 - len0 * np.cos(angles[0])
        x3 = x2 + len1 * np.sin(angles[0] + angles[1])
        y3 = y2 - len1 * np.cos(angles[0] + angles[1])
        arm_function._nengo_html_ = """
        <svg width="100%" height="100%" viewbox="0 0 100 100">
            <line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" style="stroke:black"/>
            <line x1="{x2}" y1="{y2}" x2="{x3}" y2="{y3}" style="stroke:black"/>
        </svg>
        """.format(
            **locals()
        )

    stim_angles = nengo.Node([0.3, 0.3])
    angles = nengo.Ensemble(n_neurons=200, dimensions=2)
    arm = nengo.Node(arm_function, size_in=2)
    nengo.Connection(stim_angles, angles)
    nengo.Connection(angles, arm)
