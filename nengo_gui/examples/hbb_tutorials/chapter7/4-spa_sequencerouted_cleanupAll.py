# Routed Sequencing with Cleanup all Memory

# The previous model on Routed Sequencing with cleanup memory used a scalar 
# ensemble to project only state 'A'. In this model, you will project all the 
# states onto an ensemble of neurons as the state cycles through a five element 
# sequence.

# This model has parameters as described in the book. It extends the routed 
# sequencing model by creating a scalar ensemble 'cleanup' and then projecting 
# all the states on to this ensemble using a transformation matrix 'pd_new', 
# specified by the vectors in the vocabulary.

# Press the play button to run the simulation. 
# The graph in the middle shows the semantic pointer representation of the 
# values stored in state and the graph on the bottom-right shows the response of
# the cleanup population. and the graph on the top-right shows the utility 
# (similarity) of the current basal ganglia input (i.e., state) with the 
# possible vocabulary vectors.

# Since the cleanup operation is similar to a dot product between the state and 
# the defined vocabulary vectors, the value of the cleanup population in a 
# particular dimension rises only when the value of state (top-right graph) 
# corresponds to that particular dimension.

# Setup the environment
import numpy as np 
import nengo
from nengo import spa                #import spa related packages
from nengo.spa import Vocabulary

#Number of dimensions for the Semantic Pointers
dimensions=16

#Make a model object with the SPA network
model = spa.SPA(label='Routed_Sequence with cleanupAll', seed=7)

with model:
    #Specify the modules to be used
    model.state = spa.State(dimensions=dimensions, feedback=1, 
                                        feedback_synapse=0.01)
    model.vision = spa.State(dimensions=dimensions) 
    #Specify the action mapping
    actions = spa.Actions(
        'dot(vision, START) --> state = vision',
        'dot(state, A) --> state = B',
        'dot(state, B) --> state = C',
        'dot(state, C) --> state = D',
        'dot(state, D) --> state = E',
        'dot(state, E) --> state = A'
    )
    
    #Creating the BG and Thalamus components that confirm to the specified rules
    model.BG = spa.BasalGanglia(actions=actions)
    model.thal = spa.Thalamus(model.BG)
    
    #Changing the seed of this RNG to change the vocabulary
    rng = np.random.RandomState(7)
    vocab = Vocabulary(dimensions=dimensions, rng=rng)
    
    #Creating the transformation matrix (pd_new) and cleanup ensemble (cleanup)  
    vsize = len((model.get_output_vocab('state').keys))

    pd = []
    for item in range(vsize):
        pd.append(model.get_output_vocab('state').keys[item])  
          
    pd_new = []
    for element in range(vsize):
        pd_new.append([vocab[pd[element]].v.tolist()]) 
        
    #cleanup = nengo.Ensemble(300, dimensions=vsize)
    model.cleanup = spa.State(neurons_per_dimension=300/vsize, dimensions=vsize)
    
    #Function that provides the model with an initial input semantic pointer.
    def start(t):
        if t < 0.4:
            return '0.8*START+D'
        else:
            return '0'

    #Input
    model.input = spa.Input(vision=start)
    
    #Projecting the state on to the cleanup ensemble using a transformation 
    #matrix 'pd'.
    for i in range(5):
        nengo.Connection(model.state.output, model.cleanup.input[i],
                                            transform=pd_new[i])  
                                            