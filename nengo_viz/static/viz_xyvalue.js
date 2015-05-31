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

    this.axes2d = new VIZ.Axes2D(this.div, args);
    this.axes2d.axis_y.tickValues([args.min_value, args.max_value]);
    this.axes2d.axis_x.tickValues([args.min_value, args.max_value]);

    /** scales for mapping x and y values to pixels */
    this.axes2d.scale_x.domain([args.min_value, args.max_value]);

    this.index_x = args.index_x;
    this.index_y = args.index_y;

    /** call schedule_update whenever the time is adjusted in the SimControl */
    this.sim.div.addEventListener('adjust_time',
            function(e) {self.schedule_update();}, false);

    /** create the lines on the plots */
    var line = d3.svg.line()
        .x(function(d, i) {return self.axes2d.scale_x(self.data_store.data[this.index_x][i]);})
        .y(function(d) {return self.axe2d.scale_y(d);})
    this.path = this.axes2d.svg.append("g").selectAll('path')
                                    .data([this.data_store.data[this.index_y]]);
    this.path.enter().append('path')
             .attr('class', 'line')
             .style('stroke', VIZ.make_colors(1));

    this.on_resize(this.get_screen_width(), this.get_screen_height());
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
            return self.axes2d.scale_x(
                shown_data[self.index_x][i]);
            })
        .y(function(d) {return self.axes2d.scale_y(d);})
    this.path.data([shown_data[this.index_y]])
             .attr('d', line);
};

/**
 * Adjust the graph layout due to changed size
 */
VIZ.XYValue.prototype.on_resize = function(width, height) {
    this.axes2d.on_resize(width, height);

    //this.scale_x.range([this.margin_left, width - this.margin_right]);
    //this.scale_y.range([height - this.margin_bottom, this.margin_top]);

    var plot_width = this.axes2d.ax_right - this.axes2d.ax_left;
    var plot_height = this.axes2d.ax_bottom - this.axes2d.ax_top;

    //Adjust positions of x axis on resize
    this.axes2d.axis_x_g
        .attr("transform",
              "translate(0," + (this.axes2d.ax_top + plot_height / 2) + ")");
    this.axes2d.axis_y_g
        .attr("transform",
              "translate(" + (this.axes2d.ax_left + plot_width / 2) + ",0)");
    this.update();

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
    items.push(['Set X, Y indices', function() {self.set_indices();}]);

    // add the parent's menu items to this
    // TODO: is this really the best way to call the parent's generate_menu()?
    return $.merge(items, VIZ.Component.prototype.generate_menu.call(this));
};


VIZ.XYValue.prototype.layout_info = function () {
    var info = VIZ.Component.prototype.layout_info.call(this);
    info.min_value = this.axes2d.scale_y.domain()[0];
    info.max_value = this.axes2d.scale_y.domain()[1];
    info.index_x = this.index_x;
    info.index_y = this.index_y;
    return info;
}

VIZ.XYValue.prototype.update_layout = function (config) {
    this.update_indices(config.index_x, config.index_y);
    this.update_range(config.min_value, config.max_value);
    VIZ.Component.prototype.update_layout.call(this, config);
}

VIZ.XYValue.prototype.set_range = function() {
    var range = this.axes2d.scale_y.domain();
    var self = this;
    VIZ.modal.title('Set graph range...');
    VIZ.modal.single_input_body(range, 'New range:');
    VIZ.modal.footer('ok_cancel', function(e) {
        var new_range = $('#singleInput').val();
        if (new_range !== null) {
            new_range = new_range.split(',');
            var min = parseFloat(new_range[0]);
            var max = parseFloat(new_range[1]);
            self.update_range(min, max);
            self.update();
            self.save_layout();
        }
    });
    VIZ.modal.show();
}

VIZ.XYValue.prototype.update_range = function(min, max) {
    this.axes2d.scale_x.domain([min, max]);
    this.axes2d.scale_y.domain([min, max]);
    this.axes2d.axis_x.tickValues([min, max]);
    this.axes2d.axis_y.tickValues([min, max]);
    this.axes2d.axis_y_g.call(this.axes2d.axis_y);
    this.axes2d.axis_x_g.call(this.axes2d.axis_x);
}

VIZ.XYValue.prototype.set_indices = function() {
    var self = this;
    VIZ.modal.title('Set X and Y indices...');
    VIZ.modal.single_input_body([this.index_x,this.index_y], 'New indices:');
    VIZ.modal.footer('ok_cancel', function(e) {
        var new_indices = $('#singleInput').val();
        if (new_indices !== null) {
            new_indices = new_indices.split(',');
            self.update_indices(parseInt(new_indices[0]),
                                parseInt(new_indices[1]));
            self.save_layout();
        }
    });
    VIZ.modal.show();
}

VIZ.XYValue.prototype.update_indices = function(index_x, index_y) {
    this.index_x = index_x;
    this.index_y = index_y;
    this.update();
}
