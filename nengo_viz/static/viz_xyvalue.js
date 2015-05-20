/**
 * Line graph showing decoded values over time
 * @constructor
 *
 * @param {dict} args - A set of constructor arguments (see VIZ.Component)
 * @param {int} args.n_lines - number of decoded values
 * @param {float} args.miny - minimum value on y-axis
 * @param {float} args.maxy - maximum value on y-axis
 * @param {VIZ.SimControl} args.sim - the simulation controller
 */

VIZ.XYValue = function(parent, sim, args) {
    VIZ.Component.call(this, parent, args);
    var self = this;

    this.n_lines = args.n_lines || 1;
    this.sim = sim;

    /** for storing the accumulated data */
    this.data_store = new VIZ.DataStore(this.n_lines, this.sim, 0.01);

    /** draw the plot as an SVG */
    this.svg = d3.select(this.div).append('svg')
        .attr('width', '100%')
        .attr('height', '100%');

    /** scales for mapping x and y values to pixels */
    this.scale_x = d3.scale.linear();
    this.scale_y = d3.scale.linear();
    this.scale_x.domain([args.min_value, args.max_value]);
    this.scale_y.domain([args.min_value, args.max_value]);

    this.index_x = args.index_x;
    this.index_y = args.index_y;

    /** spacing between the graph and the outside edges (in pixels) */
    this.margin_top = 30;
    this.margin_bottom = 10;
    this.margin_left = 15;
    this.margin_right = 15;

    /** set up the scales to respect the margins */
    this.scale_x.range([this.margin_left, args.width - this.margin_right]);
    this.scale_y.range([args.height - this.margin_bottom, this.margin_top]);

    var plot_width = args.width - this.margin_left - this.margin_right;
    var plot_height = args.height - this.margin_top - this.margin_bottom;


    /** define the x-axis */
    this.axis_x = d3.svg.axis()
        .scale(this.scale_x)
        .orient("bottom")
        .tickValues([args.min_value, args.max_value]);
    this.axis_x_g = this.svg.append("g")
        .attr("class", "axis axis_x")
        .attr("transform", "translate(0," + (this.margin_top + plot_height / 2) + ")")
        .call(this.axis_x);

    /** define the y-axis */
    this.axis_y = d3.svg.axis()
        .scale(this.scale_y)
        .orient("left")
        .tickValues([args.min_value, args.max_value]);
    this.axis_y_g = this.svg.append("g")
        .attr("class", "axis axis_y")
        .attr("transform", "translate(" + (this.margin_left + plot_width / 2) + ", 0)")
        .call(this.axis_y);

    /** call schedule_update whenever the time is adjusted in the SimControl */
    this.sim.div.addEventListener('adjust_time',
            function(e) {self.schedule_update();}, false);

    /** create the lines on the plots */
    var line = d3.svg.line()
        .x(function(d, i) {return self.scale_x(self.data_store.data[this.index_x][i]);})
        .y(function(d) {return self.scale_y(d);})
    this.path = this.svg.append("g").selectAll('path')
                                    .data([this.data_store.data[this.index_y]]);
    this.path.enter().append('path')
             .attr('class', 'line');

    this.on_resize(args.width, args.height);

};
VIZ.XYValue.prototype = Object.create(VIZ.Component.prototype);
VIZ.XYValue.prototype.constructor = VIZ.Value;

/**
 * Receive new line data from the server
 */
VIZ.XYValue.prototype.on_message = function(event) {
    var data = new Float32Array(event.data);
    this.data_store.push(data);
    this.schedule_update();
}

/**
 * Redraw the lines and axis due to changed data
 */
VIZ.XYValue.prototype.update = function() {
    /** let the data store clear out old values */
    this.data_store.update();

    /** update the lines */
    var self = this;
    var shown_data = this.data_store.get_shown_data();
    var line = d3.svg.line()
        .x(function(d, i) {
            return self.scale_x(
                shown_data[self.index_x][i]);
            })
        .y(function(d) {return self.scale_y(d);})
    this.path.data([shown_data[this.index_y]])
             .attr('d', line);
};

/**
 * Adjust the graph layout due to changed size
 */
VIZ.XYValue.prototype.on_resize = function(width, height) {
    this.scale_x.range([this.margin_left, width - this.margin_right]);
    this.scale_y.range([height - this.margin_bottom, this.margin_top]);

    var plot_width = width - this.margin_left - this.margin_right;
    var plot_height = height - this.margin_top - this.margin_bottom;

    //Adjust positions of x axis on resize
    this.axis_x_g
        .attr("transform",
              "translate(0," + (this.margin_top + plot_height / 2) + ")");
    this.axis_y_g
        .attr("transform",
              "translate(" + (this.margin_left + plot_width / 2) + ",0)");
    this.axis_y_g.call(this.axis_y);
    this.update();
    this.axis_x_g.call(this.axis_x);

    this.label.style.width = width;
    this.width = width;
    this.height = height;
    this.div.style.width = width;
    this.div.style.height = height;

};

VIZ.XYValue.prototype.generate_menu = function() {
    var self = this;
    var items = [];
    items.push(['Set range', function() {self.set_range();}]);
    items.push(['Set X, Y indexes', function() {self.set_indexes();}]);

    // add the parent's menu items to this
    // TODO: is this really the best way to call the parent's generate_menu()?
    return $.merge(items, VIZ.Component.prototype.generate_menu.call(this));
};


VIZ.XYValue.prototype.layout_info = function () {
    var info = VIZ.Component.prototype.layout_info.call(this);
    info.min_value = this.scale_y.domain()[0];
    info.max_value = this.scale_y.domain()[1];
    info.index_x = this.index_x;
    info.index_y = this.index_y;
    return info;
}

VIZ.XYValue.prototype.set_range = function() {
    var range = this.scale_y.domain();
    var new_range = prompt('Set range', '' + range[0] + ',' + range[1]);
    if (new_range !== null) {
        new_range = new_range.split(',');
        var min = parseFloat(new_range[0]);
        var max = parseFloat(new_range[1]);
        this.scale_x.domain([min, max]);
        this.scale_y.domain([min, max]);
        this.axis_x.tickValues([min, max]);
        this.axis_y.tickValues([min, max]);
        this.axis_y_g.call(this.axis_y);
        this.axis_x_g.call(this.axis_x);
        this.save_layout();
    }
}

VIZ.XYValue.prototype.set_indexes = function() {
    var new_indexes = prompt('Specify X and Y indexes', '' + this.index_x + ',' + this.index_y);
    if (new_indexes !== null) {
        new_indexes = new_indexes.split(',');
        this.index_x = parseInt(new_indexes[0]);
        this.index_y = parseInt(new_indexes[1]);
        this.update();
        this.save_layout();
    }
}
