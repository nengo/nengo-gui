Nengo.VPLConfig = function(){
}

Nengo.VPLConfig.prototype.redraw_graph = function(selector, x, ys, x_label, y_label){
    var self = this;
    $("#graph_container > svg").remove();
    self.graph_container.prependTo(".modal-body");
    $("<label>Tuning Curves</label>").prependTo(".modal-body");
    self.multiline_plot(selector, x, ys, x_label, y_label);
}

Nengo.VPLConfig.prototype.multiline_plot = function(selector, x, ys, x_label, y_label) {

    var margin = {left: 30, top: 0, right: 0, bottom: 30};
    var w = 500 - margin.left - margin.right;
    var h = 220 - margin.bottom - margin.top;
    var graph_w = w + margin.left + margin.right;
    var graph_h = h + margin.bottom + margin.top;
    var text_offset = 15;

    var scale_x = d3.scale.linear()
        .domain([  x[0], x[x.length - 1]  ])
        .range([margin.left, w - margin.right]);
    var scale_y = d3.scale.linear()
        .domain([d3.min(ys, function(y){ return d3.min(y); }) - 0.01,
                 d3.max(ys, function(y){ return d3.max(y); }) + 0.01])
        .range([h+margin.top, margin.top]);

    // Add an SVG element with the desired dimensions and margin.
    var svg = d3.select(selector).append("svg")
        .attr("viewBox","0 0 "+graph_w+" "+graph_h)
        .attr("width","100%")
        .attr("height","100%");

    // create the axes
    var xAxis = d3.svg.axis()
        .scale(scale_x)
        .orient("bottom")
        .ticks(9);
    svg.append("g")
        .attr("class", "axis axis_x unselectable")
        .attr("transform", "translate(0," + (h+margin.top)  + ")")
        .call(xAxis);

    var yAxisLeft = d3.svg.axis()
        .scale(scale_y)
        .ticks(5)
        .orient("left");
    var yAxisRight = d3.svg.axis()
        .scale(scale_x)
        .scale(scale_y)
        .ticks(5)
        .orient("right");
    svg.append("g")
        .attr("class", "axis axis_y unselectable")
        .attr("transform", "translate(" + margin.left + ",0)")
        .call(yAxisLeft);
    svg.append("g")
        .attr("class", "axis axis_y unselectable")
        .attr("transform", "translate(" + w + ",0)")
        .call(yAxisRight);

    // label the axes
    if (x_label !== "") {
        svg.append("text")
            .attr("class", "x label")
            .attr("text-anchor", "middle")
            .attr("x", graph_w / 2)
            .attr("y", text_offset + graph_h - margin.bottom / 2)
            .text(x_label);
    }

    if (y_label !== "") {
        svg.append("text")
            .attr("class", "y label")
            .attr("text-anchor", "middle")
            .attr("x", -graph_h/2)
            .attr("y", -text_offset + margin.left / 2)
            .attr("dy", ".75em")
            .attr("transform", "rotate(-90)")
            .text(y_label);
    }

    // add the lines
    var colors = Nengo.make_colors(ys.length);

    var line = d3.svg.line()
        .x(function(d, i) { return scale_x(x[i]); })
        .y(function(d) { return scale_y(d); })

    svg.append("g")
        .selectAll("path")
        .data(ys)
      .enter()
        .append("path")
        .attr("d", line)
        .attr("class", "line")
        .style("stroke", function(d, i) { return colors[i]; });
}
