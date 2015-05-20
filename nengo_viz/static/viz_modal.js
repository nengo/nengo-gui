VIZ.Modal = {};

VIZ.Modal.show = function() {
    this.sim_was_running = !sim.paused;
    $('.modal').first().modal('show');
    sim.pause()
}

$('.modal').first().on('hidden.bs.modal', function () {
    if (VIZ.Modal.sim_was_running) {
        sim.play();
    }
})

VIZ.Modal.title = function(title) {
    $('.modal-title').first().text(title);
}

VIZ.Modal.footer = function(type){
    var $footer = $('.modal-footer').first();
    $footer.empty();

    if (type === "close") {
        $footer.append('<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>');
    } else {
        console.warn('Modal footer type ' + type + ' no recognized.')
    }
}

/**
 * Static multiline plot with shared x-axis
 *
 * @param {String} selector - Where the svg will be added
 * @param {Array of Float} x - The shared x-axis
 * @param {Array of Array of Float} ys - The y data for each line
 */
VIZ.Modal.multiline_plot = function(selector, x, ys) {
    var m = {left: 40, top: 0, right: 0, bottom: 30};
    var w = 500 - m.left - m.right;
    var h = 220 - m.bottom - m.top;

    var scale_x = d3.scale.linear()
        .domain([x[0], x[x.length-1]])
        .range([m.left, w - m.right]);
    var scale_y = d3.scale.linear()
        .domain([0, d3.max(ys, function(y){ return d3.max(y); })])
        .range([h+m.top, 0]);

    // Add an SVG element with the desired dimensions and margin.
    var graph = d3.select(selector).append("svg")
	.attr("width", w + m.left + m.right)
	.attr("height", h + m.bottom + m.top);

    var xAxis = d3.svg.axis()
        .scale(scale_x)
        .orient("bottom")
        .ticks(9);
    graph.append("g")
	.attr("class", "axis axis_x unselectable")
	.attr("transform", "translate(0," + (h+m.top)  + ")")
	.call(xAxis);

    var yAxisLeft = d3.svg.axis()
        .scale(scale_y)
        .orient("left");
    graph.append("g")
	.attr("class", "axis axis_y unselectable")
	.attr("transform", "translate(" + m.left + ",0)")
	.call(yAxisLeft);

    var colors = VIZ.make_colors(ys.length);

    var line = d3.svg.line()
	.x(function(d, i) { return scale_x(x[i]); })
	.y(function(d) { return scale_y(d); })

    graph.selectAll("path")
        .data(ys)
      .enter()
        .append("path")
        .attr("d", line)
        .attr("class", "line")
        .style("stroke", function(d, i) { return colors[i]; });
}

VIZ.Modal.render_plot = function($parent, plotinfo) {
    $parent.append("<h4>" + plotinfo.title + "</h4>")

    if (plotinfo.warnings.length > 0) {
        var $warn = $('<div class="alert alert-warning" role="alert"/>')
            .appendTo($parent);

        for (var i = 0; i < plotinfo.warnings.length; i++) {
            var $p = $('<p/>').appendTo($warn);
            $p.append('<span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>');
            $p.append('<span class="sr-only">Warning:</span>');
            $p.append(document.createTextNode(plotinfo.warnings[i]));
        }
    }

    if (plotinfo.plot === 'multiline') {
        VIZ.Modal.multiline_plot($parent.get(0), plotinfo.x, plotinfo.y);
    } else if (plotinfo.plot !== 'none') {
        console.warn("Plot type " + plotinfo.plot +
                     " not understood, or not implemented yet.");
    }
}

VIZ.Modal.ensemble_body = function(uid, params, plots) {
    var $body = $('.modal-body').first();
    $body.empty();

    $body.append('<ul class="nav nav-tabs">'+
                 '  <li class="active"><a href="#params" data-toggle="tab">Parameters</a></li>'+
                 '  <li><a href="#plots" data-toggle="tab">Plots</a></li>'+
                 '  <li><a href="#connections" data-toggle="tab">Connections</a></li>'+
                 '</ul>');

    var $content = $('<div class="tab-content"/>').appendTo($body);

    // Parameters
    var $params = $('<div class="tab-pane active" id="params"/>')
        .appendTo($content);
    var $plist = $('<dl class="dl-horizontal"/>').appendTo($params);
    for (var i = 0; i < params.length; i++) {
        $plist
            .append('<dt id="dt' + i + '">' + params[i][0] + '&nbsp;</dt>')
            .append('<dd>' + params[i][1] + '</dd>');

        // Make tooltip
        $tooltip = $('<a href="#" data-toggle="popover" data-placement="right"' +
                     'title="' + VIZ.tooltips["ens"][String(params[i][0])][0] + '"' +
                     'data-content="' + VIZ.tooltips["ens"][String(params[i][0])][1] + '">' +
                     '<span class="glyphicon glyphicon-question-sign" aria-hidden="true"/></a>');

        // Add tooltip to dt
        $('#dt' + i).first().append($tooltip);

        // Initialize tooltip
        $tooltip.popover({"trigger": "hover"});
        // $tooltip.popover();    // For debugging
    }

    // Plots
    var $plots = $('<div class="tab-pane" id="plots"/>').appendTo($content);

    // This indicates an error (usually no sim running)
    if (typeof plots === 'string') {
        var $err = $('<div class="alert alert-danger" role="alert"/>')
            .appendTo($plots);
        $err.append('<span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>');
        $err.append('<span class="sr-only">Error:</span>');
        $err.append(document.createTextNode(siminfo.errors[i]));
    }
    else {
        for (var i=0; i < plots.length; i++) {
            VIZ.Modal.render_plot($plots, plots[i]);
        }
    }

    // Connections
    var $connections = $('<div class="tab-pane" id="connections"/>')
        .appendTo($content);
    var $clist = $('<dl/>').appendTo($connections);

    $clist.append($('<dt class="dt-connections">Incoming Connections:</dt>'));
    var conn_in_objs = VIZ.netgraph.svg_objects[uid].conn_in;
    for (var i = 0; i < conn_in_objs.length; i++) {
        $clist.append('<dd>' + conn_in_objs[i].pre.label.innerHTML + '</dd>');
    }

    $clist.append($('<dt class="dt-connections">Outgoing Connections:</dt>'));
    var conn_out_objs = VIZ.netgraph.svg_objects[uid].conn_out;
    for (var i = 0; i < conn_out_objs.length; i++) {
        $clist.append('<dd>' + conn_out_objs[i].post.label.innerHTML + '</dd>');
    }
}
