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

    // Flag for whether or not update code should be changing the highlight
    // Both zooming and the simulator time changing cause an update, but the highlight
    // should only update when the time is changing
    this.neuron_highlight_updates = false;
    
    // Keep track of mouse position TODO: fix this to be not required
    this.mouse_position = [0,0];

    this.neuron_highlights_g = this.axes2d.svg.append('g')
        .attr('class', 'neuron_highlights');

    // Index of the neuron that makes a sound when spiking
    this.sound_index = -1;
    //this.neuron_sound = new Audio('data:audio/wav;base64,' + 'UklGRuIAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0Yb4AAACH/4H/rP99/9j+uP8XAKr8jQJVAIz6EggS+iD7nAim+DL2/wt8Bxvo7w2ADlj6XRSC+RT+PRM9/KEO9Q1z6x0EZvxT6y4ZTPaZr8e+qNSYApASyeW6/SAQFv/qCPYXjiLUGfITZwRpBPUpJRBsCw4hm/wH+4ARShkiEKALwgqEHIUpVhdXOpAxJh3POPgwdiOkGQokbS1CFBkKcA0p6ZDQ1s1fvui7+adth1yR36nrvEHAwLf6yyzdF+Hz5gb3');
    this.neuron_sound = new Audio('data:audio/wav;base64,' + 'UklGRiYAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQIAAAD9dg==');

    // TODO: put the neuron highlight properties in CSS
    this.neuron_highlights_g.append('rect')
            .attr('id', 'neuron_highlights_Y')
            .attr('stroke', 'black')
            .attr('fill', 'black')
            .attr('fill-opacity', '0.1')
            .attr('stroke-width', '0.5px');

    // TODO: have the fonts and colour set appropriately
    this.neuron_highlights_g.append('text')
            .attr('id', 'neuron_highlights_text')
            .style('text-anchor', 'end')
            .attr('class', 'graph_text');

    this.axes2d.svg
            .on('mouseover', function() {
                var mouse = d3.mouse(this);
                self.neuron_highlight_updates = true;
                self.neuron_highlights_g.style('display', null);                
                self.mouse_position = [mouse[0], mouse[1]];
            })
            .on('mouseout', function() {
                var mouse = d3.mouse(this);
                self.neuron_highlight_updates = false;
                self.neuron_highlights_g.style('display', 'none');                
                self.mouse_position = [mouse[0], mouse[1]];
            })
            .on('mousemove', function() {
                var mouse = d3.mouse(this);
                self.neuron_highlight_updates = true;
                self.mouse_position = [mouse[0], mouse[1]];
                self.update_highlight(mouse);
            })

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

    // make a sound if the neuron spiked
    if ($.inArray(this.sound_index-1, data) > -1) {
        this.neuron_sound.play();
    }
}

Nengo.Raster.prototype.set_n_neurons = function(n_neurons) {
    this.n_neurons = n_neurons;
    this.axes2d.scale_y.domain([0, n_neurons]);
    this.axes2d.axis_y.tickValues([0, n_neurons]);
    this.ws.send('n_neurons:' + n_neurons);
}

Nengo.Raster.prototype.update_highlight = function(mouse) {
    var self = this;
    var x = mouse[0];
    var y = mouse[1];

    // TODO: I don't like having ifs here, make a smaller rectangle for mouseovers
    if (x > this.axes2d.ax_left && x < this.axes2d.ax_right && y > this.axes2d.ax_top && y < this.axes2d.ax_bottom-1) {
        var y1 = this.axes2d.scale_y.invert(y);
        var y2 = this.axes2d.scale_y(Math.ceil(y1));
        var y3 = this.axes2d.scale_y(Math.ceil(y1-1));

        this.neuron_highlights_g.style('display', null);

        this.neuron_highlights_g.select('#neuron_highlights_Y')
            .attr('x', this.axes2d.ax_left)
            .attr('y', y2)
            .attr('width', this.axes2d.width)
            .attr('height', y3-y2);

        this.neuron_highlights_g.select('#neuron_highlights_text')
            .attr('x', this.axes2d.ax_left - 3)
            .attr('y', y2 + (y3-y2)/2 + 3)
            .text(function () {
                return Math.ceil(y1);
            });
        this.sound_index = Math.ceil(y1);
    } else {
        this.neuron_highlights_g.style('display', 'none');
        this.sound_index = -1;
    }
};

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

    //** Update the crosshair text if the mouse is on top */
    if (this.neuron_highlight_updates) {
        this.update_highlight(this.mouse_position);
    }

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

Nengo.Raster.prototype.generate_menu = function() {
    var self = this;
    var items = [];
    items.push(['Set # neurons...', function() {self.set_neuron_count();}]);

    return $.merge(items, Nengo.Component.prototype.generate_menu.call(this));
};

Nengo.Raster.prototype.set_neuron_count = function() {
    var count = this.n_neurons;
    var self = this;
    Nengo.modal.title('Set number of neurons...');
    Nengo.modal.single_input_body(count, 'Number of neurons');
    Nengo.modal.footer('ok_cancel', function(e) {
        var new_count = $('#singleInput').val();
        var modal = $('#myModalForm').data('bs.validator');
        modal.validate();
        if (modal.hasErrors() || modal.isIncomplete()) {
            return;
        }
        if (new_count !== null) {
            new_count = parseInt(new_count);
            self.set_n_neurons(new_count);
            self.axes2d.fit_ticks(self);
        }
        $('#OK').attr('data-dismiss', 'modal');
    });
    var $form = $('#myModalForm').validator({
        custom: {
            my_validator: function($item) {
                var num = $item.val();
                var valid = false;
                if ($.isNumeric(num)) {
                    num = Number(num);
                    if (num >= 0 && Number.isInteger(num)) {
                        valid = true;
                    }
                }
                return valid;
            }
        },
    });

    $('#singleInput').attr('data-error', 'Input should be a positive integer');

    Nengo.modal.show();
    $('#OK').on('click', function() {
        var w = $(self.div).width();
        var h = $(self.div).height();
        self.on_resize(w, h);
    })
}

