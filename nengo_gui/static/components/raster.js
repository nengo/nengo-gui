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
    this.draw_clicked = false;
    this.do_sound = false;

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
                self.mouse_position = [mouse[0], mouse[1]];
            })
            .on('mouseleave', function() {
                var mouse = d3.mouse(this);
                self.neuron_highlight_updates = false;
                if (!self.draw_clicked) {
                    self.neuron_highlights_g.style('display', 'none');
                }                
                self.mouse_position = [mouse[0], mouse[1]];
            })
            .on('mousemove', function() {
                var mouse = d3.mouse(this);
                self.neuron_highlight_updates = true;
                self.mouse_position = [mouse[0], mouse[1]];
                self.update_highlight(mouse, false);
            })
            .on('click', function() {
                var mouse = d3.mouse(this);
                self.neuron_highlight_updates = true;
                self.mouse_position = [mouse[0], mouse[1]];
                self.update_highlight(mouse, true);
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
Nengo.Raster.prototype.init_sound = function() {
    // A click sound made with Chris' computer. To construct such an array run
    // ffmpeg -loglevel quiet -i click.wav -f f32le - |
    // LC_ALL=C od -tfF click.raw | cut -c8-
    const audio_data = [
    -0.0037, -0.0039, -0.0026, -0.0040, -0.0090, -0.0022,  0.0007, -0.0261,
     0.0199,  0.0026, -0.0426,  0.0630, -0.0463, -0.0381,  0.0673, -0.0574,
    -0.0766,  0.0937,  0.0585, -0.1867,  0.1089,  0.1133, -0.0442,  0.1591,
    -0.0507, -0.0150,  0.1503, -0.0294,  0.1143,  0.1090, -0.1606,  0.0321,
    -0.0281, -0.1615,  0.1967, -0.0758, -0.6281, -0.5096, -0.3386,  0.0203,
     0.1450, -0.2048, -0.0178,  0.1260, -0.0071,  0.0696,  0.1872,  0.2700,
     0.2018,  0.1558,  0.0344,  0.0345,  0.3278,  0.1261,  0.0892,  0.2582,
    -0.0265, -0.0388,  0.1367,  0.1976,  0.1260,  0.0908,  0.0840,  0.2228,
     0.3244,  0.1823,  0.4558,  0.3872,  0.2277,  0.4438,  0.3826,  0.2770,
     0.2003,  0.2816,  0.3549,  0.1583,  0.0789,  0.1050, -0.1784, -0.3706,
    -0.3919, -0.5127, -0.5320, -0.6877, -0.9420, -0.8644, -0.6729, -0.5241,
    -0.4980, -0.5645, -0.4064, -0.2721, -0.2415, -0.1957, -0.0701,
    ];

    // Instantiate the WebAudio context, only one per browser window
    if (Nengo.audio_ctx) {
        return;
    }
    Nengo.audio_ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Create the AudioBuffer object containing the audio data, transfer the
    // data from the above array into the audio buffer object
    if (Nengo.audio_ctx) {
        Nengo.audio_click_sound = Nengo.audio_ctx.createBuffer(
                1, audio_data.length, 44100);
        const channel_data = Nengo.audio_click_sound.getChannelData(0);
        for (let i = 0; i < audio_data.length; i++) {
            // Attenuate the sound to prevent clipping with high rates
            channel_data[i] = 0.5 * audio_data[i];
        }
    }
}

Nengo.Raster.prototype.on_message = function(event) {
    var time = new Float32Array(event.data, 0, 1);
    var data = new Int16Array(event.data, 4);
    this.data_store.push([time[0], data]);
    this.schedule_update();

    // make a sound if the neuron spiked
    if ($.inArray(this.sound_index-1, data) > -1) {
        if (!Nengo.audio_ctx) {
            this.init_sound();
        }
        if (Nengo.audio_ctx && Nengo.audio_click_sound) {
            const source = Nengo.audio_ctx.createBufferSource();
            source.buffer = Nengo.audio_click_sound;
            source.connect(Nengo.audio_ctx.destination);
            source.start(0);
        }
    }
}

Nengo.Raster.prototype.set_n_neurons = function(n_neurons) {
    this.n_neurons = n_neurons;
    this.axes2d.scale_y.domain([0, n_neurons]);
    this.axes2d.axis_y.tickValues([0, n_neurons]);
    this.ws.send('n_neurons:' + n_neurons);
}

Nengo.Raster.prototype.update_highlight = function(mouse, click) {
    var self = this;
    var x = mouse[0];
    var y = mouse[1];

    if (!self.do_sound) {
        this.neuron_highlights_g.style('display', 'none');
        this.sound_index = -1;
        return;
    }
    // TODO: I don't like having ifs here, make a smaller rectangle for mouseovers
    if (x > this.axes2d.ax_left && x < this.axes2d.ax_right && y > this.axes2d.ax_top && y < this.axes2d.ax_bottom-1) {
        var y1 = this.axes2d.scale_y.invert(y);
        var new_sound_index = Math.ceil(y1);
        var y2 = this.axes2d.scale_y(new_sound_index);
        var y3 = this.axes2d.scale_y(new_sound_index-1);

        this.neuron_highlights_g.style('display', null);

        if (click){
            if (new_sound_index == this.sound_index) {
                this.draw_clicked = false;
                this.sound_index = -1;
            } else {
                this.draw_clicked = true;
                this.sound_index = new_sound_index;
            }
        }

        //draw the currently clicked highlight
        if (this.draw_clicked) {
            var ys2 = this.axes2d.scale_y(this.sound_index)
            var ys3 = this.axes2d.scale_y(this.sound_index-1)

            this.neuron_highlights_g.select('#neuron_highlights_Y')
                .attr('x', this.axes2d.ax_left)
                .attr('y', ys2)
                .attr('width', this.axes2d.ax_right - this.axes2d.ax_left)
                .attr('height', ys3-ys2);

            this.neuron_highlights_g.select('#neuron_highlights_text')
                .attr('x', this.axes2d.ax_left - 3)
                .attr('y', ys2 + (ys3-ys2)/2 + 3)
                .text(function () {
                    return self.sound_index;
                });
        } else {
            //draw the temporary highlight
            this.neuron_highlights_g.select('#neuron_highlights_Y')
                .attr('x', this.axes2d.ax_left)
                .attr('y', y2)
                .attr('width', this.axes2d.ax_right - this.axes2d.ax_left)
                .attr('height', y3-y2);

            this.neuron_highlights_g.select('#neuron_highlights_text')
                .attr('x', this.axes2d.ax_left - 3)
                .attr('y', y2 + (y3-y2)/2 + 3)
                .text(function () {
                    return new_sound_index;
                });            
        }

    } else {
        //this.neuron_highlights_g.style('display', 'none');
        //this.sound_index = -1;
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

    //** Update the highlight text if the mouse is on top */
    if (this.neuron_highlight_updates) {
        this.update_highlight(this.mouse_position, false);
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
    this.sound_index = -1;
}

Nengo.Raster.prototype.generate_menu = function() {
    var self = this;
    var items = [];
    items.push(['Set # neurons...', function() {self.set_neuron_count();}]);
    if (!self.do_sound) {
        items.push(['Audible spike sounds', function() {self.do_sound = true; self.draw_clicked=false;}]);
    } else {
        items.push(['No sounds', function() {self.do_sound = false;}]);
    }

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
