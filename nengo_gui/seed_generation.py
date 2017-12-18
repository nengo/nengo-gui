import nengo
import nengo.utils.numpy as npext
import numpy as np


def define_all_seeds(net, seeds=None):
    if seeds is None:
        seeds = {}

    if net.seed is None:
        if net not in seeds:
            # this only happens at the very top level
            seeds[net] = np.random.randint(npext.maxint)
        rng = np.random.RandomState(seed=seeds[net])
    else:
        rng = np.random.RandomState(seed=net.seed)

    # let's use the same algorithm as the builder, just to be consistent
    sorted_types = sorted(net.objects, key=lambda t: t.__name__)
    for obj_type in sorted_types:
        for obj in net.objects[obj_type]:
            # generate a seed for each item, so that manually setting a seed
            #  for a particular item doesn't change the generated seed for
            #  other items
            generated_seed = rng.randint(npext.maxint)
            if obj.seed is None:
                seeds[obj] = generated_seed

    for subnet in net.networks:
        define_all_seeds(subnet, seeds)

    return seeds
