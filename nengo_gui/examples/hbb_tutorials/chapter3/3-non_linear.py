# Nonlinear Transformations

# The real world is filled with non-linearities and so dealing
# with them often requires nonlinear computation. This model shows
# how to compute nonlinear functions using Nengo 2.0. The two nonlinear
# functions demonstrated in this model are 'multiplication' and 'squaring'.

# The parameters of the model are as described in the book. The model has five
# ensembles: two input ensembles (ens_X and ens_Y), a 2D combined ensemble (vector2D),
# and the output ensembles result_square and result_product which store the
# square and product of the inputs respectively.

# Two varying scalar values are used for the two input signals that drive
# activity in ensembles A and B. For multiplication, we project both
# inputs independently into a 2D space, and then decode a nonlinear
# transformation of that space (i.e., the product) into an ensemble
# (result_product). The model also squares the value of the first input
# (input_X) encoded in an ensemble (ens_X), in the output of another ensemble
# (result_square).

# The two functions product(x) and square(x) are defined to serve the same
# purpose as entering the expressions in the "Expression" field in the
# "User-defined Function" dialog box in Nengo 1.4 as described in the book.

# Press the play button to run the simulation.
# The input signals chosen clearly show that the model works well.
# The result_product graph shows the product of the input_X & input_Y, and
# the result_square graph shows the squre of input_X. You can see in the graphs
# that when input_X is zero, both the product and the square are also zero. You
# can use the sliders to change the input values provided by the input_X and
# input_Y nodes to test the model.

# To inspect any values in the graphs, you can hover your mouse over the graph
# and the x and t values will be displayed near the axis.  This can be easier
# when you pause the simulation.  When you pause, you can also drag the blue
# box at the bottom of the screen to slide backwards and forward through time.

# Setup the environment
import nengo
from nengo.processes import Piecewise

# Create the network object to which we can add ensembles, connections, etc.
model = nengo.Network(label="Nonlinear Function")

with model:
    # Input - Piecewise step functions
    input_X = nengo.Node(
        Piecewise({0: -0.75, 1.25: 0.5, 2.5: -0.75, 3.75: 0}), label="Input X"
    )
    input_Y = nengo.Node(
        Piecewise({0: 1, 1.25: 0.25, 2.5: -0.25, 3.75: 0.75}), label="Input Y"
    )

    # Five ensembles containing LIF neurons
    # Represents input_X
    ens_X = nengo.Ensemble(100, dimensions=1, radius=1, label="X")
    # Represents input_Y
    ens_Y = nengo.Ensemble(100, dimensions=1, radius=1, label="Y")
    # 2D ensemble to represent combined X and Y values
    vector2D = nengo.Ensemble(224, dimensions=2, radius=2)

    # Represents the square of X
    result_square = nengo.Ensemble(100, dimensions=1, radius=1, label="Square")
    # Represents the product of X and Y
    result_product = nengo.Ensemble(100, dimensions=1, radius=1, label="Product")

    # Connecting the input nodes to the appropriate ensembles
    nengo.Connection(input_X, ens_X)
    nengo.Connection(input_Y, ens_Y)

    # Connecting input ensembles A and B to the 2D combined ensemble
    nengo.Connection(ens_X, vector2D[0])
    nengo.Connection(ens_Y, vector2D[1])

    # Defining a function that computes the product of two inputs
    def product(x):
        return x[0] * x[1]

    # Defining the squaring function
    def square(x):
        return x[0] * x[0]

    # Connecting the 2D combined ensemble to the result ensemble
    nengo.Connection(vector2D, result_product, function=product)

    # Connecting ensemble A to the result ensemble
    nengo.Connection(ens_X, result_square, function=square)
