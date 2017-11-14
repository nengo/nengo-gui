import * as $ from "jquery";

import "./tooltips.css";

export const Ens = {
    n_neurons: ["Type: int", "The number of neurons."],
    dimensions: [
        "Type: int",
        "The number of dimensions in the represented " + "state space."
    ],
    radius: [
        "Type: int\nDefault: 1.0",
        "The radius of the state space represented by " + "the ensemble."
    ],
    encoders: [
        "Type: Distribution or ndarray (`n_neurons`, " +
            "`dimensions`)\nDefault: UniformHypersphere" +
            "(surface=True)",
        "The encoders, used to transform from state space " +
            "to neuron space. Each row is a neuron's encoder, " +
            "each column is a dimension of the state space."
    ],
    intercepts: [
        "Type: Distribution or ndarray (`n_neurons`)\n" +
            "Default: Uniform(-1.0, 1.0)",
        "The point along each neuron's encoder where its " +
            "activity is zero. If e is the neuron's encoder, " +
            "then the activity will be zero when dot(x, e) " +
            "<= c, where c is the given intercept."
    ],
    max_rates: [
        "Type: Distribution or ndarray (`n_neurons`)\n" +
            "Default: Uniform(200, 400)",
        "The activity of each neuron when dot(x, e) = 1, " +
            "where e is the neuron's encoder."
    ],
    eval_points: [
        "Type: Distribution or ndarray (`n_eval_points`, " +
            "`dims`)\nDefault: UniformHypersphere()",
        "The evaluation points used for decoder solving, " +
            "spanning the interval (-radius, radius) in each " +
            "dimension, or a distribution from which to " +
            "choose evaluation points."
    ],
    n_eval_points: [
        "Type: int\nDefault: None",
        "The number of evaluation points to be drawn " +
            "from the `eval_points` distribution. If None " +
            "(the default), then a heuristic is used to " +
            "determine the number of evaluation points."
    ],
    neuron_type: [
        "Type: Neurons\nDefault: LIF()",
        "The single cell model used to simulate all " +
            "neurons in the ensemble."
    ],
    noise: [
        "Type: StochasticProcess\nDefault: None",
        "Random noise injected directly into each neuron in the " +
            "ensemble as current. A sample is drawn for each " +
            "individual neuron on every simulation step."
    ],
    seed: [
        "Type: int\nDefault: None",
        "The seed used for random number generation."
    ]
};

export const Node = {
    output: [
        "Type: callable, array_like, or None",
        "The function that transforms the Node inputs into " +
            "outputs, or a constant output value. If ``None``, " +
            "the input will be returned unchanged."
    ],
    size_in: [
        "Type: int\nDefault: 0",
        "The number of dimensions in the input signal."
    ],
    size_out: [
        "Type: int",
        "The number of dimensions in the output signal. If " +
            "not specified, it will be determined based on the " +
            "values of ``output`` and ``size_in``."
    ]
};

export const Conn = {
    expand: ["Click to show / hide full path"],
    fan_passthrough: [
        "This connection is to / from a passthrough n" +
            "ode: Fan in / out information is approximate."
    ]
};
