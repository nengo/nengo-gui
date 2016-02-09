/**
 *
 * Control panel for a simulation
 * @constructor
 *
 * @param {DOMElement} div - the element for the control
 * @param {dict} args - A set of constructor arguments, including:
 * @param {int} args.id - the id of the server-side SimControl to connect to
 *
 * SimControl constructor is inserted into HTML file from python and
 * is called when the page is first loaded
 */
Nengo.SimControl = function(div, args) {
    if (args.uid[0] === '<') {
        console.log("invalid uid for SimControl: " + args.uid);
    }
    var self = this;

    div.classList.add('sim_control');
    this.div = div;

    /** respond to resize events */
    this.div.addEventListener("resize", function() {self.on_resize();});
    window.addEventListener("resize", function() {self.on_resize();});

    /** the most recent time from the simulator */
    this.time = 0.0;
    /** the most recent rate information from the simulator */
    this.rate = 0.0;
    /** whether the simulation is paused */
    this.paused = true;
    /** do we have an update() call scheduled? */
    this.pending_update = false;

    /** Create the WebSocket to communicate with the server */
    this.ws = Nengo.create_websocket(args.uid);

    this.ws.onmessage = function(event) {self.on_message(event);}
    this.ws.onclose = function(event) {self.disconnected()}

    /** Create the TimeSlider */
    this.time_slider = new Nengo.TimeSlider({x: 200, y: 10, sim:this,
                                           width: this.div.clientWidth-300,
                                           height: this.div.clientHeight-20,
                                           shown_time: args.shown_time,
                                           kept_time: args.kept_time});

    /** Get reference to the pause button */
    this.pause_button = $('#pause_button')[0];
    this.pause_button.onclick = function(event) {self.on_pause_click();};
    this.pause_button.onkeydown = function(event) {
        var key = event.key || String.fromCharCode(event.keyCode);
        if (key == ' ') {
            event.stopPropagation();
        }
    };
    Nengo.set_transform(this.pause_button, this.div.clientWidth - 100, 30);

    this.pause_button_icon = $('#pause_button_icon')[0];

    /** Get reference to the reset button */
    this.reset_button = $('#reset_button')[0];
    this.reset_button.onclick = function(event) {self.reset();};
    Nengo.set_transform(this.reset_button, 110, 30);

    /** Create the speed and rate update sliders */
    this.rate_tr = $('#rate_tr')[0];
    this.ticks_tr = $('#ticks_tr')[0];


    this.speed_throttle_set = false;
    this.speed_throttle_changed = false;
    this.speed_throttle = $('#speed_throttle')[0];

    this.speed_throttle_guideline = document.createElement('div');
    this.speed_throttle_guideline.classList.add('guideline');
    this.speed_throttle.appendChild(this.speed_throttle_guideline);

    this.speed_throttle_handle = document.createElement('div');
    this.speed_throttle_handle.classList.add('btn');
    this.speed_throttle_handle.classList.add('btn-default');
    this.speed_throttle_handle.innerHTML = '';
    this.speed_throttle.appendChild(this.speed_throttle_handle);

    this.time_scale = d3.scale.linear();
    this.time_scale.clamp(true);
    this.time_scale.domain([0,  1.0]);
    this.time_scale.range([0,  110.0]);  // width in pixels of slider
    this.speed_throttle_handle.style.left = this.time_scale(1.0);

    interact(this.speed_throttle_handle)
        .draggable({
            onstart: function (event) {
                self.speed_throttle_x = parseFloat(self.speed_throttle_handle.style.left);
                self.speed_throttle_set = true;
            },
            onmove: function (event) {
                self.speed_throttle_changed = true;
                self.speed_throttle_x += event.dx;
                var pixel_value = self.time_scale(self.time_scale.invert(self.speed_throttle_x));
                self.speed_throttle_handle.style.left = pixel_value;
            },
        });

    this.simulator_options = '';

    this.update();
};

/** Event handler for received WebSocket messages */
Nengo.SimControl.prototype.on_message = function(event) {
    if (typeof event.data === 'string') {
        if (event.data.substring(0, 7) === 'status:') {
            this.set_status(event.data.substring(7));
        }
        else if (event.data.substring(0, 6) === 'config') {
            eval(event.data.substring(6, event.data.length));
        }
        else if (event.data.substring(0, 5) === 'sims:') {
            this.simulator_options = event.data.substring(5, event.data.length);
        }
    }
    else {
        var data = new Float32Array(event.data);
        this.time = data[0];
        this.rate = data[1];
        this.rate_proportion = data[2];
        if (!this.speed_throttle_set) {
            this.speed_throttle_handle.style.left = this.time_scale(this.rate_proportion);
        }
        this.schedule_update();
    }

    if (this.speed_throttle_changed) {
        this.speed_throttle_changed = false;
        var pixel_value = parseFloat(this.speed_throttle_handle.style.left);
        var value = this.time_scale.invert(pixel_value);
        this.ws.send('target_scale:' + value);
    }
};

Nengo.SimControl.prototype.disconnected = function() {
    $('#main').css('background-color', '#a94442')
    Nengo.modal.title("Nengo has stopped running");
    Nengo.modal.text_body("To continue working with your model, re-run nengo_gui and click Refresh.", "danger");
    Nengo.modal.footer('refresh');
    Nengo.modal.show();
}

Nengo.SimControl.prototype.set_backend = function(backend) {
    this.ws.send('backend:' + backend);
};

Nengo.SimControl.prototype.set_status = function(status) {
    var icon;
    status = status.trim();
    if (status === 'building') {
        icon = 'glyphicon-cog';
        this.start_rotating_cog();
        this.paused = false;
    } else if (status === 'paused') {
        icon = 'glyphicon-play';
        this.stop_rotating_cog();
        this.paused = true;
    } else if (status === 'running') {
        icon = 'glyphicon-pause';
        this.stop_rotating_cog();
        this.paused = false;
    } else if (status === 'build_error') {
        icon = 'glyphicon-remove';
        this.stop_rotating_cog();
        this.paused = false;
    } else {
        icon = 'glyphicon-cog';
        this.stop_rotating_cog();
        console.log('unknown status: ' + status);
        this.paused = false;
    }
    this.pause_button_icon.className = "glyphicon " + icon;
}

Nengo.SimControl.prototype.start_rotating_cog = function() {
    var self = this;
    this.rotation = 0;
    this.rotationInterval = window.setInterval(function() {
        self.pause_button_icon.style.transform = "rotate(" + self.rotation + "deg)";
        self.rotation += 2;
    }, 10);
    this.pause_button.setAttribute("disabled","true");
    $('#pause_button').addClass('play-pause-button-cog');        
}

Nengo.SimControl.prototype.stop_rotating_cog = function() {
    this.pause_button.removeAttribute("disabled");
    $('#pause_button').removeClass('play-pause-button-cog');        
    window.clearInterval(this.rotationInterval);
    this.pause_button_icon.style.transform = "";
}

/** Make sure update() will be called in the next 10ms  */
Nengo.SimControl.prototype.schedule_update = function() {
    if (this.pending_update == false) {
        this.pending_update = true;
        var self = this;
        window.setTimeout(function() {self.update()}, 10);
    }
}

/** Add to list of functions to be called when SimControl options change */
Nengo.SimControl.prototype.register_listener = function(func) {
    this.listeners.push(func);
};

/** Update the visual display */
Nengo.SimControl.prototype.update = function() {
    this.pending_update = false;

    this.ticks_tr.innerHTML = '<th>Time</th><td>' + this.time.toFixed(3) + '</td>';
    this.rate_tr.innerHTML = '<th>Speed</th><td>' + this.rate.toFixed(2) + 'x</td>';

    this.time_slider.update_times(this.time);
};

Nengo.SimControl.prototype.pause = function() {
    if (!this.paused) {
        this.ws.send('pause');
    }
    this.paused = true;
}

Nengo.SimControl.prototype.play = function() {
    if (this.paused) {
        this.ws.send('continue');
        this.paused = false;
    }
}

Nengo.SimControl.prototype.on_pause_click = function(event) {
    if (this.paused) {
        this.play();
    } else {
        this.pause();
    }
};

/* informs the backend simulator of the time being reset */
Nengo.SimControl.prototype.reset = function() {
    this.paused = true;
    this.ws.send('reset');
};

Nengo.SimControl.prototype.on_resize = function(event) {
    this.time_slider.resize(this.div.clientWidth - 290,
                            this.div.clientHeight - 20);
    Nengo.set_transform(this.pause_button, this.div.clientWidth - 100, 30);
    Nengo.set_transform(this.reset_button, 110, 30);
}


Nengo.TimeSlider = function(args) {
    var self = this;

    /** The SimControl object */
    this.sim = args.sim;

    /** get reference to the overall div */
    this.div = $(".time_slider")[0];
    Nengo.set_transform(this.div, args.x, args.y);

    /** create reference to the div indicating currently shown time */
    this.shown_div = $(".shown_time")[0];

    /** How much time to show in normal graphs */
    this.shown_time = args.shown_time || 0.5;
    /** How much total time to store */
    this.kept_time = args.kept_time || 4.0;
    /** Most recent time received from simulation */
    this.last_time = 0.0;
    /** First time shown on graphs */
    this.first_shown_time = this.last_time - this.shown_time;

    /** call reset whenever the simulation is reset */
    this.sim.div.addEventListener('sim_reset',
            function(e) {self.reset();}, false);
            
    /** scale to convert time to x value (in pixels) */
    this.kept_scale = d3.scale.linear();

    this.kept_scale.domain([0.0 - this.kept_time, 0.0]);

    this.resize(args.width, args.height);

    /** make the shown time draggable and resizable */
    interact(this.shown_div)
        .draggable({
            onmove: function (event) {
                /** determine where we have been dragged to in time */
                var x = self.kept_scale(self.first_shown_time) + event.dx;
                var new_time = Nengo.clip(
                    self.kept_scale.invert(x),
                    self.last_time - self.kept_time,
                    self.last_time - self.shown_time);

                self.first_shown_time = new_time;
                x = self.kept_scale(new_time);
                Nengo.set_transform(event.target, x, 0);

                /** update any components who need to know the time changed */
                self.sim.div.dispatchEvent(new Event('adjust_time'));
            }
        })
        .resizable({
            edges: {left: true, right: true, bottom: false, top: false}
        })
        .on('resizemove', function (event) {
            var xmin = self.kept_scale(self.last_time - self.kept_time);
            var xmax = self.kept_scale(self.last_time);
            var xa0 = self.kept_scale(self.first_shown_time);
            var xb0 = self.kept_scale(self.first_shown_time + self.shown_time);
            var xa1 = xa0 + event.deltaRect.left;
            var xb1 = xb0 + event.deltaRect.right;

            var min_width = 45;
            xa1 = Nengo.clip(xa1, xmin, xb0 - min_width);
            xb1 = Nengo.clip(xb1, xa0 + min_width, xmax);

            /** set slider width and position */
            event.target.style.width = (xb1 - xa1) + 'px';
            Nengo.set_transform(event.target, xa1, 0);

            /** update times */
            var ta1 = self.kept_scale.invert(xa1);
            var tb1 = self.kept_scale.invert(xb1);
            self.first_shown_time = ta1;
            self.shown_time = tb1 - ta1;

            /** update any components who need to know the time changed */
            self.sim.div.dispatchEvent(new Event('adjust_time'));
        });

    /** build the axis to display inside the scroll area */
    this.svg = d3.select(this.div).append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('style', 'pointer-events: none; position: absolute;');
    this.axis = d3.svg.axis()
        .scale(this.kept_scale)
        .orient("bottom")
        .ticks(10);
    this.axis_g = this.svg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0," + (args.height / 2) + ")")
        .call(this.axis);
}

Nengo.TimeSlider.prototype.jump_to_end = function() {
    this.first_shown_time = this.last_time - this.shown_time;

    x = this.kept_scale(this.first_shown_time);
    Nengo.set_transform(this.shown_div, x, 0);

    /** update any components who need to know the time changed */
    this.sim.div.dispatchEvent(new Event('adjust_time'));
}

Nengo.TimeSlider.prototype.reset = function() {
    this.last_time = 0.0;
    this.first_shown_time = this.last_time - this.shown_time;

    /** update the limits on the time axis */
    this.kept_scale.domain([this.last_time - this.kept_time, this.last_time]);

    /** update the time axis display */
    this.axis_g
        .call(this.axis);
        
    x = this.kept_scale(this.first_shown_time);
    Nengo.set_transform(this.shown_div, x, 0);

    /** update any components who need to know the time changed */
    this.sim.div.dispatchEvent(new Event('adjust_time'));
}

/**
 * Adjust size and location of parts based on overall size
 */
Nengo.TimeSlider.prototype.resize = function(width, height) {
    this.div.style.width = width;
    this.div.style.height = height;
    this.kept_scale.range([0, width]);
    this.shown_div.style.height = height;
    this.shown_div.style.width = width * this.shown_time / this.kept_time;
    Nengo.set_transform(this.shown_div,
                      this.kept_scale(this.first_shown_time), 0);

    if (this.axis_g !== undefined) {
        this.axis_g.call(this.axis);
    }
}

/**
 * Update the axis given a new time point from the simulator
 */
Nengo.TimeSlider.prototype.update_times = function(time) {
    var delta = time - this.last_time;   // time since last update_time()

    if (delta < 0) {
        self.sim.div.dispatchEvent(new Event('sim_reset'));
        return;
    }
    this.last_time = time;
    this.first_shown_time = this.first_shown_time + delta;

    /** update the limits on the time axis */
    this.kept_scale.domain([time - this.kept_time, time]);

    /** update the time axis display */
    this.axis_g
        .call(this.axis);
}
