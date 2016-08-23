# Learning a communication channel

# This model shows how to include synaptic plasticity in Nengo models using the 
# hPES learning rule. Here we implement error-driven learning to learn to 
# compute a simple communication channel. This is done by using an error signal  
# provided by a neural ensemble to modulate the connection between two other 
# ensembles.

# The model has parameters as described in the book. Note that hPES learning 
# rule is built into Nengo 1.4 as mentioned in the book. The same rule can be 
# implemented in Nengo 2.0 by combining the PES and the BCM rule as shown in the
# code. Also, instead of using the 'gate' and 'switch' as described in the book,
# 'inhibit' population is used which serves the same purpose of turning off the 
# learning by inhibiting the error population. For computing the actual error 
# (which is required only for analysis), direct mode can be used by specifying 
# the neuron_type as 'nengo.Direct()' while creating the 'actual_error' ensemble.

# When you run the model, you will see that the 'post' population gradually 
# learns to compute the communication channel. In the model, you will inhibit 
# the error population after 15 seconds to turn off learning and you will see 
# that the 'post' population will still track the 'pre' population showing that 
# the model has actually learned the input.

# Press the play button to run the simulation.
# From the plots, you will see that the post population initially doesn't track 
# the pre population but eventually it learns the function (which is a 
# communication channel in this case) and starts tracking the post population. 
# After the error is inhibited (i.e., t>15s, shown by value zero in the error 
# plot), the post population continues to track the pre population. The 
# actual_error graph shows that there is significant error between the pre and 
# the post populations at the begining which eventually gets reduced to almost 
# zero as model learns the communication channel.

# The model can also learn other functions by using an appropriate error signal.
# For example to learn a square function, comment out the lines marked 
# 'Communication Channel' and uncomment the lines marked 'Square' in the code. 
# Run the model again and you will see that the model successfully learns the 
# square function.

#Setup the environment
import numpy as np
import nengo
from nengo.processes import WhiteSignal

model = nengo.Network(label='Learning', seed=8)
with model:
    #Ensembles to represent populations
    pre = nengo.Ensemble(50, dimensions=1)
    post = nengo.Ensemble(50, dimensions=1)
    error = nengo.Ensemble(100, dimensions=1)
    actual_error = nengo.Ensemble(100, dimensions=1, neuron_type=nengo.Direct())
    
    #Actual Error = pre - post (direct mode)
    #Square
    #nengo.Connection(pre, actual_error, function=lambda x: x**2, transform=-1)   
    nengo.Connection(pre, actual_error, transform=-1)   #Communication Channel
    nengo.Connection(post, actual_error, transform=1)
     
    #Error = pre - post
    #Square
    #nengo.Connection(pre, error, function=lambda x: x**2, transform=-1)
    #Communication Channel
    nengo.Connection(pre, error, transform=-1, synapse=0.02)
    nengo.Connection(post, error, transform=1, synapse=0.02)
    
    #Connecting pre population to post population (communication channel)
    conn = nengo.Connection(pre, post, function=lambda x: np.random.random(1),
                            solver=nengo.solvers.LstsqL2(weights=True))
    
    #Adding the learning rule to the connection 
    conn.learning_rule_type ={'my_pes': nengo.PES(learning_rate=1e-3), 
                                        'my_bcm': nengo.BCM()}

    #Error connections don't impart current
    error_conn = nengo.Connection(error, conn.learning_rule['my_pes'])
    
    #Providing input to the model
    input = nengo.Node(WhiteSignal(30, high=10))     # RMS = 0.5 by default
    # Connecting input to the pre ensemble
    nengo.Connection(input, pre, synapse=0.02)  
    
    #function to inhibit the error population after 25 seconds
    def inhib(t):
        return 2.0 if t > 15.0 else 0.0
    
    #Connecting inhibit population to error population
    inhibit = nengo.Node(inhib)
    nengo.Connection(inhibit, error.neurons, transform=[[-1]] * error.n_neurons, 
                                                synapse=0.01)
                                                
                                                