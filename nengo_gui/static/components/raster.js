/**
 * Raster plot showing spike events over time
 * @constructor
 *
 * @param {DOMElement} parent - the element to add this component to
 * @param {Nengo.SimControl} sim - the simulation controller
 * @param {dict} args - A set of constructor arguments (see Nengo.Component)
 * @param {int} args.n_neurons - number of neurons
 *
 * Raster constructor is called by python server when a user requests a plot 
 * or when the config file is making graphs. Server request is handled in 
 * netgraph.js {.on_message} function.
 */
Nengo.Raster = function(parent, sim, args) {
    Nengo.Component.call(this, parent, args);
    var self = this;
    this.n_neurons = args.n_neurons || 1;
    this.sim = sim;

    /** for storing the accumulated data */
    this.data_store = new Nengo.DataStore(1, this.sim, 0);

    this.axes2d = new Nengo.TimeAxes(this.div, args);
    this.axes2d.scale_y.domain([0, args.n_neurons]);


    /** call schedule_update whenever the time is adjusted in the SimControl */
    this.sim.div.addEventListener('adjust_time',
            function(e) {self.schedule_update();}, false);

    /** call reset whenever the simulation is reset */
    this.sim.div.addEventListener('sim_reset',
            function(e) {self.reset();}, false);

    /** create the lines on the plots */
    var line = d3.svg.line()
        .x(function(d, i) {return self.axes2d.scale_x(times[i]);})
        .y(function(d) {return self.axes2d.scale_y(d);})
    this.path = this.axes2d.svg.append("g").selectAll('path')
                                    .data(this.data_store.data);

    this.path.enter().append('path')
             .attr('class', 'line')
             .style('stroke', Nengo.make_colors(1));

    this.update();
    this.on_resize(this.get_screen_width(), this.get_screen_height());
    this.axes2d.axis_y.tickValues([0, args.n_neurons]);
    this.axes2d.fit_ticks(this);
};
Nengo.Raster.prototype = Object.create(Nengo.Component.prototype);
Nengo.Raster.prototype.constructor = Nengo.Raster;

/**
 * Receive new line data from the server
 */
Nengo.Raster.prototype.on_message = function(event) {
    var time = new Float32Array(event.data, 0, 1);
    var data = new Int16Array(event.data, 4);
    this.data_store.push([time[0], data]);
    this.schedule_update();
}

/**
 * Redraw the lines and axis due to changed data
 */
Nengo.Raster.prototype.update = function() {
    /** let the data store clear out old values */
    this.data_store.update();

    /** determine visible range from the Nengo.SimControl */
    var t1 = this.sim.time_slider.first_shown_time;
    var t2 = t1 + this.sim.time_slider.shown_time;

    this.axes2d.set_time_range(t1, t2);

    /** update the lines */
    var shown_data = this.data_store.get_shown_data();

    var path = [];
    for (var i = 0; i < shown_data[0].length; i++) {
        var t = this.axes2d.scale_x(
                    this.data_store.times[
                        this.data_store.first_shown_index + i]);

        for (var j = 0; j < shown_data[0][i].length; j++) {
            var y1 = this.axes2d.scale_y(shown_data[0][i][j]);
            var y2 = this.axes2d.scale_y(shown_data[0][i][j]+1);
            path.push('M ' + t + ' ' + y1 + 'V' + y2);
        }
    }
    this.path.attr("d", path.join(""));
};

/**
 * Adjust the graph layout due to changed size
 */
Nengo.Raster.prototype.on_resize = function(width, height) {
    if (width < this.minWidth) {
        width = this.minWidth;
    }
    if (height < this.minHeight) {
        height = this.minHeight;
    };

    this.axes2d.on_resize(width, height);

    this.update();

    this.label.style.width = width;

    this.width = width;
    this.height = height;
    this.div.style.width = width;
    this.div.style.height= height;
};

Nengo.Raster.prototype.reset = function(event) {
    this.data_store.reset();
    this.schedule_update();
}
