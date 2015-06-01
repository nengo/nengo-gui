VIZ.tooltips = {};

VIZ.tooltips.tooltip = function($parent, content, placement, icon) {
    if (typeof(placement) === 'undefined') { placement = "bottom"; }

    var $tooltip = $('<a href="#" data-toggle="tooltip" ' +
                     'data-placement="' + placement + '" ' + 'title="' +
                     content + '"/>');
    $tooltip.append('<sup>?</>').appendTo($parent);
    $tooltip.tooltip();
}

VIZ.tooltips.popover = function($parent, title, content, placement, icon) {
    if (typeof(placement) === 'undefined') { placement = "bottom"; }

    var $tooltip = $('<a href="#" data-toggle="popover" ' +
                     'data-placement="' + placement + '" ' + 'title="' +
                     title + '"' + 'data-content="' + content + '"/>');
    $tooltip.append('<sup>?</>').appendTo($parent);
    $tooltip.popover({"trigger": "hover"});
}

/* Ensemble Parameters */
VIZ.tooltips.ens = {};
VIZ.tooltips.ens.n_neurons = ["Type: int", "The number of neurons."];
VIZ.tooltips.ens.dimensions = [
    "Type: int", "The number of dimensions in the represented state space."];
VIZ.tooltips.ens.radius = [
    "Type: int\nDefault: 1.0", "The radius of the state space represented by the  ensemble."];
VIZ.tooltips.ens.encoders = [
    "Type: Distribution or ndarray (`n_neurons`, `dimensions`)\n"+
        "Default: UniformHypersphere(surface=True)",
    "The encoders, used to transform from state space to neuron "+
        "space. Each row is a neuron's encoder, each column is a "+
        "dimension of the state space."];
VIZ.tooltips.ens.intercepts = [
    "Type: Distribution or ndarray (`n_neurons`)\nDefault: Uniform(-1.0, 1.0)",
    "The point along each neuron's encoder where its activity is zero. "+
        "If e is the neuron's encoder, then the activity will be zero when "+
        "dot(x, e) <= c, where c is the given intercept."];
VIZ.tooltips.ens.max_rates = [
    "Type: Distribution or ndarray (`n_neurons`)\nDefault: Uniform(200, 400)",
    "The activity of each neuron when dot(x, e) = 1, " +
        "where e is the neuron's encoder."];
VIZ.tooltips.ens.eval_points = [
    "Type: Distribution or ndarray (`n_eval_points`, `dims`)\n" +
        "Default: UniformHypersphere()",
    "The evaluation points used for decoder solving, spanning the interval " +
        "(-radius, radius) in each dimension, or a distribution from which " +
        "to choose evaluation points."];
VIZ.tooltips.ens.n_eval_points = [
    "Type: int\nDefault: None",
    "The number of evaluation points to be drawn from the `eval_points` " +
        "distribution. If None (the default), then a heuristic is used to " +
        "determine the number of evaluation points."];
VIZ.tooltips.ens.neuron_type = [
    "Type: Neurons\nDefault: LIF()",
    "The single cell model used to simulate all neurons in the ensemble."];
VIZ.tooltips.ens.noise = [
    "Type: StochasticProcess\nDefault: None",
    "Random noise injected directly into each neuron in the ensemble " +
        "as current. A sample is drawn for each individual neuron " +
        "on every simulation step."];
VIZ.tooltips.ens.seed = ["Type: int\nDefault: None",
                         "The seed used for random number generation."];

/* Node Parameters */
VIZ.tooltips.node = {};
VIZ.tooltips.node.output = [
    "Type: callable, array_like, or None",
    "The function that transforms the Node inputs into outputs, or a " +
        "constant output value. If ``None``, the input will be " +
        "returned unchanged."];
VIZ.tooltips.node.size_in = [
    "Type: int\nDefault: 0",
    "The number of dimensions in the input signal."];
VIZ.tooltips.node.size_out = [
    "Type: int", "The number of dimensions in the output signal. If not " +
        "specified, it will " +
        "be determined based on the values of ``output`` and ``size_in``."];


/* Connection Parameters */
VIZ.tooltips.conn = {};
VIZ.tooltips.conn.expand = ["Click to show / hide full path"];
VIZ.tooltips.conn.fan_passthrough = ["This connection is to / from a passthrough node: Fan in / out information is approximate."];
