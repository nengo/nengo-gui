/**
 * Raster plot showing spike events over time
 * @constructor
 *
 * @param {dict} args - A set of constructor arguments (see Nengo.Component)
 * @param {int} args.n_neurons - number of neurons
 * @param {Nengo.SimControl} args.sim - the simulation controller
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

    /** create the lines on the plots */
    var line = d3.svg.line()
        .x(function(d, i) {return self.axes2d.scale_x(times[i]);})
        .y(function(d) {return self.axes2d.scale_y(d);})
    this.path = this.axes2d.svg.append("g").selectAll('path')
                                    .data(this.data_store.data);

    this.path.enter().append('path')
             .attr('class', 'line');

    this.spikes = this.axes2d.svg.append("g")
        .attr('class', 'spikes')
        .style('stroke', Nengo.make_colors(1));

    this.update();
    this.on_resize(this.get_screen_width(), this.get_screen_height());
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
    var self = this;
    var shown_data = this.data_store.get_shown_data();

    var loc = [];
    for (var i = 0; i < shown_data[0].length; i++) {
        var t = this.axes2d.scale_x(this.data_store.times[this.data_store.first_shown_index + i]);

        for (var j = 0; j < shown_data[0][i].length; j++) {
            loc.push([
                t,
                this.axes2d.scale_y(shown_data[0][i][j]),
                this.axes2d.scale_y(shown_data[0][i][j]+1)]);
        }
    }

    var spikes = this.spikes.selectAll('line').data(loc)
            .attr('x1', function(d) {return d[0]})
            .attr('x2', function(d) {return d[0]})
            .attr('y1', function(d) {return d[1]})
            .attr('y2', function(d) {return d[2]});
    spikes.enter()
            .append('line')
            .attr('x1', function(d) {return d[0]})
            .attr('x2', function(d) {return d[0]})
            .attr('y1', function(d) {return d[1]})
            .attr('y2', function(d) {return d[2]});
    spikes.exit().remove();
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