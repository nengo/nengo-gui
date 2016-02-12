/**
 *
 * Line graph showing decoded values over time
 * @constructor
 *
 * @param {DOMElement} parent - the element to add this component to
 * @param {Nengo.SimControl} sim - the simulation controller
 * @param {dict} args - A set of constructor arguments (see Nengo.Component)
 * @param {int} args.n_lines - number of decoded values
 * @param {float} args.min_value - minimum value on y-axis
 * @param {float} args.max_value - maximum value on y-axis
 *
 * Value constructor is called by python server when a user requests a plot 
 * or when the config file is making graphs. Server request is handled in 
 * netgraph.js {.on_message} function.
 */

Nengo.Value = function(parent, sim, args) {
    Nengo.Component.call(this, parent, args);
    var self = this;
    this.n_lines = args.n_lines || 1;
    this.sim = sim;
    this.display_time = args.display_time;

    /** for storing the accumulated data */
    var synapse = (args.synapse !== null) ? args.synapse : 0.01;
    this.data_store = new Nengo.DataStore(this.n_lines, this.sim, synapse);

    this.axes2d = new Nengo.TimeAxes(this.div, args);

    /** call schedule_update whenever the time is adjusted in the SimControl */
    this.sim.div.addEventListener('adjust_time',
            function(e) {self.schedule_update();}, false);

    /** call reset whenever the simulation is reset */
    this.sim.div.addEventListener('sim_reset',
            function(e) {self.reset();}, false);

    /** create the lines on the plots */
    this.line = d3.svg.line()
        .x(function(d, i) {
            return self.axes2d.scale_x(
                self.data_store.times[i + self.data_store.first_shown_index]);
            })
        .y(function(d) {return self.axes2d.scale_y(d);})
    this.path = this.axes2d.svg.append("g").selectAll('path')
                                    .data(this.data_store.data);

    this.colors = Nengo.make_colors(this.n_lines);
    this.path.enter()
             .append('path')
             .attr('class', 'line')
             .style('stroke', function(d, i) {return self.colors[i];});
    
    // Flag for whether or not update code should be changing the crosshair
    // Both zooming and the simulator time changing cause an update, but the crosshair
    // should only update when the time is changing
    this.crosshair_updates = false;
    
    // Keep track of mouse position TODO: fix this to be not required
    this.crosshair_mouse = [0,0];

    this.crosshair_g = this.axes2d.svg.append('g')
        .attr('class', 'crosshair');

    // TODO: put the crosshair properties in CSS
    this.crosshair_g.append('line')
            .attr('id', 'crosshairX')
            .attr('stroke', 'black')
            .attr('stroke-width', '0.5px');

    this.crosshair_g.append('line')
            .attr('id', 'crosshairY')
            .attr('stroke', 'black')
            .attr('stroke-width', '0.5px');

    // TODO: have the fonts and colour set appropriately
    this.crosshair_g.append('text')
            .attr('id', 'crosshairXtext')
            .style('text-anchor', 'middle')
            .attr('class', 'graph_text');

    this.crosshair_g.append('text')
            .attr('id', 'crosshairYtext')
            .style('text-anchor', 'end')
            .attr('class', 'graph_text');

    this.axes2d.svg
            .on('mouseover', function() {
                var mouse = d3.mouse(this);
                self.crosshair_updates = true;
                self.crosshair_g.style('display', null);
                self.cross_hair_mouse = [mouse[0], mouse[1]];
            })
            .on('mouseout', function() {
                var mouse = d3.mouse(this);
                self.crosshair_updates = false;
                self.crosshair_g.style('display', 'none');
                self.cross_hair_mouse = [mouse[0], mouse[1]];
            })
            .on('mousemove', function() {
                var mouse = d3.mouse(this);
                self.crosshair_updates = true;
                self.cross_hair_mouse = [mouse[0], mouse[1]];
                self.update_crosshair(mouse);
            })
            .on('mousewheel', function() {
                // Hide the crosshair when zooming, until a better option comes along
                self.crosshair_updates = false;
                self.crosshair_g.style('display', 'none');
            });

    this.update();
    this.on_resize(this.get_screen_width(), this.get_screen_height());
    this.axes2d.axis_y.tickValues([args.min_value, args.max_value]);
    this.axes2d.fit_ticks(this);

    this.colors = Nengo.make_colors(6);
    this.color_func = function(d, i) {return self.colors[i % 6]};
    this.legend = document.createElement('div');
    this.legend.classList.add('legend');
    this.div.appendChild(this.legend);

    this.legend_labels = args.legend_labels || [];
    if (this.legend_labels.length !== this.n_lines) {
        // fill up the array with temporary labels
        for (var i=this.legend_labels.length; i<this.n_lines; i++) {
            this.legend_labels[i] = "label_" + i;
        }
    }

    this.show_legend = args.show_legend || false;
    if (this.show_legend === true) {
        Nengo.draw_legend(this.legend, this.legend_labels.slice(0, self.n_lines), this.color_func);
    }
};

Nengo.Value.prototype = Object.create(Nengo.Component.prototype);
Nengo.Value.prototype.constructor = Nengo.Value;

Nengo.Value.prototype.update_crosshair = function(mouse) {
    var self = this;
    var x = mouse[0];
    var y = mouse[1];

    // TODO: I don't like having ifs here, make a smaller rectangle for mouseovers
    if (x > this.axes2d.ax_left && x < this.axes2d.ax_right && y > this.axes2d.ax_top && y < this.axes2d.ax_bottom) {
        this.crosshair_g.style('display', null);

        this.crosshair_g.select('#crosshairX')
            .attr('x1', x)
            .attr('y1', this.axes2d.ax_top)
            .attr('x2', x)
            .attr('y2', this.axes2d.ax_bottom);

        this.crosshair_g.select('#crosshairY')
            .attr('x1', this.axes2d.ax_left)
            .attr('y1', y)
            .attr('x2', this.axes2d.ax_right)
            .attr('y2', y);

        this.crosshair_g.select('#crosshairXtext')
            .attr('x', x - 2)
            .attr('y', this.axes2d.ax_bottom + 17) //TODO: don't use magic numbers
            .text(function () {
                return Math.round(self.axes2d.scale_x.invert(x) * 100) / 100;
            });

        this.crosshair_g.select('#crosshairYtext')
            .attr('x', this.axes2d.ax_left - 3)
            .attr('y', y + 3)
            .text(function () {
                return Math.round(self.axes2d.scale_y.invert(y) * 100) / 100;
            });
    } else {
        this.crosshair_g.style('display', 'none');
    }
};

/**
 * Receive new line data from the server
 */
Nengo.Value.prototype.on_message = function(event) {
    var data = new Float32Array(event.data);
    data = Array.prototype.slice.call(data);
    var size = this.n_lines + 1;
    /** since multiple data packets can be sent with a single event,
    make sure to process all the packets */
    while (data.length >= size) {
        this.data_store.push(data.slice(0, size));
        data = data.slice(size);
    }
    if (data.length > 0) {
        console.log('extra data: ' + data.length);
    }
    this.schedule_update();
};

/**
 * Redraw the lines and axis due to changed data
 */
Nengo.Value.prototype.update = function() {
    /** let the data store clear out old values */
    this.data_store.update();

    /** determine visible range from the Nengo.SimControl */
    var t1 = this.sim.time_slider.first_shown_time;
    var t2 = t1 + this.sim.time_slider.shown_time;

    this.axes2d.set_time_range(t1, t2);

    /** update the lines */
    var self = this;
    var shown_data = this.data_store.get_shown_data();

    this.path.data(shown_data)
             .attr('d', self.line);

    //** Update the crosshair text if the mouse is on top */
    if (this.crosshair_updates) {
	this.update_crosshair(this.cross_hair_mouse);
    }
};

/**
 * Adjust the graph layout due to changed size
 */
Nengo.Value.prototype.on_resize = function(width, height) {
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

Nengo.Value.prototype.generate_menu = function() {
    var self = this;
    var items = [];
    items.push(['Set range...', function() {self.set_range();}]);

    if (this.show_legend) {
        items.push(['Hide legend', function() {self.set_show_legend(false);}]);
    } else {
        items.push(['Show legend', function() {self.set_show_legend(true);}]);
    }

    // TODO: give the legend it's own context menu
    items.push(['Set legend labels', function () {self.set_legend_labels();}])

    // add the parent's menu items to this
    return $.merge(items, Nengo.Component.prototype.generate_menu.call(this));
};

Nengo.Value.prototype.set_show_legend = function(value){
    if (this.show_legend !== value) {
        this.show_legend = value;
        this.save_layout();

        if (this.show_legend === true) {
            Nengo.draw_legend(this.legend, this.legend_labels.slice(0, this.n_lines), this.color_func);
        } else {
            // delete the legend's children
            while (this.legend.lastChild) {
                this.legend.removeChild(this.legend.lastChild);
            }
        }
    }
}

Nengo.Value.prototype.set_legend_labels = function() {
    var self = this;

    Nengo.modal.title('Enter comma seperated legend label values');
    Nengo.modal.single_input_body('Legend label', 'New value');
    Nengo.modal.footer('ok_cancel', function(e) {
        var label_csv = $('#singleInput').val();
        var modal = $('#myModalForm').data('bs.validator');
        
        // No validation to do.
        // Empty entries assumed to be indication to skip modification
        // Long strings okay
        // Excissive entries get ignored
        // TODO: Allow escaping of commas
        if ((label_csv !== null) && (label_csv !== '')) {
            labels = label_csv.split(',');

            for (var i=0; i<self.n_lines; i++) {
                if (labels[i] !== "" && labels[i] !== undefined) {
                     self.legend_labels[i] = labels[i];
                }
            }

            // redraw the legend with the updated label values
            while (self.legend.lastChild) {
                self.legend.removeChild(self.legend.lastChild);
            }

            Nengo.draw_legend(self.legend, self.legend_labels, self.color_func);
            self.save_layout();
        }
        $('#OK').attr('data-dismiss', 'modal');
    });

    Nengo.modal.show();
}

Nengo.Value.prototype.layout_info = function () {
    var info = Nengo.Component.prototype.layout_info.call(this);
    info.show_legend = this.show_legend;
    info.legend_labels = this.legend_labels;
    info.min_value = this.axes2d.scale_y.domain()[0];
    info.max_value = this.axes2d.scale_y.domain()[1];
    return info;
}

Nengo.Value.prototype.update_layout = function(config) {
    this.update_range(config.min_value, config.max_value);
    Nengo.Component.prototype.update_layout.call(this, config);
}

Nengo.Value.prototype.set_range = function() {
    var range = this.axes2d.scale_y.domain();
    var self = this;
    Nengo.modal.title('Set graph range...');
    Nengo.modal.single_input_body(range, 'New range');
    Nengo.modal.footer('ok_cancel', function(e) {
        var new_range = $('#singleInput').val();
        var modal = $('#myModalForm').data('bs.validator');
        modal.validate();
        if (modal.hasErrors() || modal.isIncomplete()) {
            return;
        }
        if (new_range !== null) {
            new_range = new_range.split(',');
            var min = parseFloat(new_range[0]);
            var max = parseFloat(new_range[1]);
            self.update_range(min, max);
            self.save_layout();
            self.axes2d.axis_y.tickValues([min, max])
            self.axes2d.fit_ticks(self);
        }
        $('#OK').attr('data-dismiss', 'modal');
    });
    var $form = $('#myModalForm').validator({
        custom: {
            my_validator: function($item) {
                var nums = $item.val().split(',');
                var valid = false;
                if ($.isNumeric(nums[0]) && $.isNumeric(nums[1])) {
                    if (Number(nums[0]) < Number(nums[1])) {
                        valid = true; //Two numbers, 1st less than 2nd
                    }
                }
                return (nums.length==2 && valid);
            }
        },
    });

    $('#singleInput').attr('data-error', 'Input should be in the ' +
                           'form "<min>,<max>".');
    Nengo.modal.show();
    $('#OK').on('click', function () {
        var w = $(self.div).width();
        var h = $(self.div).height();
        self.on_resize(w, h);
    })
}

Nengo.Value.prototype.update_range = function(min, max) {
    this.axes2d.scale_y.domain([min, max]);
    this.axes2d.axis_y_g.call(this.axes2d.axis_y);
}

Nengo.Value.prototype.reset = function(event) {
    this.data_store.reset();
    this.schedule_update();
}
