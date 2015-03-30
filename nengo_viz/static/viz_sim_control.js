/**
 * Control panel for a simulation
 * @constructor
 *
 * @param {DOMElement} div - the element for the control
 * @param {dict} args - A set of constructor arguments, including:
 * @param {int} args.id - the id of the server-side SimControl to connect to
 */
VIZ.SimControl = function(div, args) {
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
    this.paused = false;
    /** do we have an update() call scheduled? */
    this.pending_update = false;

    /** Create the WebSocket to communicate with the server */ 
    this.ws = new WebSocket('ws://localhost:8080/viz_component?uid=' + args.uid);
    this.ws.binaryType = "arraybuffer";
    this.ws.onmessage = function(event) {self.on_message(event);}
    
    /** Create the TimeSlider */
    this.time_slider = new VIZ.TimeSlider({x: 200, y: 10, sim:this,
                                           width: this.div.clientWidth-300, 
                                           height: this.div.clientHeight-20,
                                           shown_time: args.shown_time,
                                           kept_time: args.kept_time});
    
    /** Create the pause button */
    this.pause_button = document.createElement('button');
    this.pause_button.className = "btn btn-default play-pause-button";
    this.pause_button.innerHTML = '<span class="glyphicon glyphicon-pause"></span>';
    this.pause_button_icon = $(this.pause_button).find('.glyphicon');
    this.pause_button.onclick = function(event) {self.on_pause_click();};
    div.appendChild(this.pause_button);
    
    this.metrics_div = document.createElement('div');
    this.metrics_div.className = 'metrics-container';
    div.appendChild(this.metrics_div);
    /** Create the speed and rate update sliders */
    this.rate_div = document.createElement('div');
    this.metrics_div.appendChild(this.rate_div);
    this.ticks_div = document.createElement('div');
    this.metrics_div.appendChild(this.ticks_div);
};

/** Event handler for received WebSocket messages */
VIZ.SimControl.prototype.on_message = function(event) {
    var data = new Float32Array(event.data);
    this.time = data[0];
    this.rate = data[1];

    this.schedule_update();
};    

/** Make sure update() will be called in the next 10ms  */
VIZ.SimControl.prototype.schedule_update = function() {
    if (this.pending_update == false) {
        this.pending_update = true;
        var self = this;
        window.setTimeout(function() {self.update()}, 10);
    }
}

/** Add to list of functions to be called when SimControl options change */
VIZ.SimControl.prototype.register_listener = function(func) {
    this.listeners.push(func);
};

/** Update the visual display */    
VIZ.SimControl.prototype.update = function() {
    this.pending_update = false;
    
    this.ticks_div.innerHTML = 'Time: ' + this.time.toFixed(3);
    this.rate_div.innerHTML = 'Speed: ' + this.rate.toFixed(2) + 'x';
    
    this.time_slider.update_times(this.time);
};

VIZ.SimControl.prototype.on_pause_click = function(event) {
    if (this.paused) {
        this.ws.send('continue');
        this.paused = false;
    } else {
        this.ws.send('pause');
        this.paused = true;
    }
    this.pause_button_icon.toggleClass('glyphicon-pause glyphicon-play');
};

VIZ.SimControl.prototype.on_resize = function(event) {
    this.time_slider.resize(this.div.clientWidth - 300, 
                            this.div.clientHeight - 20);

}

VIZ.TimeSlider = function(args) {
    var self = this;

    /** The SimControl object */
    this.sim = args.sim;

    /** How much time to show in normal graphs */
    this.shown_time = args.shown_time || 0.5;
    /** How much total time to store */
    this.kept_time = args.kept_time || 4.0;
    /** Most recent time received from simulation */
    this.last_time = 0.0;
    /** First time shown on graphs */
    this.first_shown_time = this.last_time - this.shown_time;
    
    /** scale to convert time to x value (in pixels) */
    this.kept_scale = d3.scale.linear();
    
    /** create the overall div */
    this.div = document.createElement('div');
    this.div.classList.add('time_slider');
    this.div.style.position = 'fixed';
    this.sim.div.appendChild(this.div);
    VIZ.set_transform(this.div, args.x, args.y);

    /** create the div indicating currently shown time */
    this.shown_div = document.createElement('div');
    this.shown_div.classList.add('shown_time');
    this.shown_div.style.position = 'fixed';
    this.div.appendChild(this.shown_div);

    this.kept_scale.domain([0.0 - this.kept_time, 0.0]);

    this.resize(args.width, args.height);

    /** make the shown time draggable */
    interact(this.shown_div)
        .draggable({
            onmove: function (event) {
                /** determine where we have been dragged to in time */
                var x = self.kept_scale(self.first_shown_time) + event.dx;
                var new_time = self.kept_scale.invert(x);

                /** make sure we're within bounds */
                if (new_time > self.last_time - self.shown_time) {
                    new_time = self.last_time - self.shown_time;
                }
                if (new_time < self.last_time - self.kept_time) {
                    new_time = self.last_time - self.kept_time;
                }
                self.first_shown_time = new_time;
                
                x = self.kept_scale(new_time);
                VIZ.set_transform(event.target, x, 0);

                /** update any components who need to know the time changed */
                self.sim.div.dispatchEvent(new Event('adjust_time'));
            }
        })
        
    
    /** build the axis to display inside the scroll area */
    this.svg = d3.select(this.div).append('svg')
        .attr('width', '100%')
        .attr('height', '100%');   
    this.axis = d3.svg.axis()
        .scale(this.kept_scale)
        .orient("bottom")
        .ticks(10);
    this.axis_g = this.svg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0," + (args.height / 2) + ")")
        .call(this.axis);
    
}


/**
 * Adjust size and location of parts based on overall size
 */
VIZ.TimeSlider.prototype.resize = function(width, height) {
    this.div.style.width = width;
    this.div.style.height = height;
    this.kept_scale.range([0, width]);
    this.shown_div.style.height = height;
    this.shown_div.style.width = width * this.shown_time / this.kept_time;
    VIZ.set_transform(this.shown_div, 
                      this.kept_scale(this.first_shown_time), 0);
}

/**
 * Update the axis given a new time point from the simulator
 */
VIZ.TimeSlider.prototype.update_times = function(time) {
    var delta = time - this.last_time;   // time since last update_time()
    this.last_time = time;
    this.first_shown_time = this.first_shown_time + delta;

    /** update the limits on the time axis */
    this.kept_scale.domain([time - this.kept_time, time]);
    
    /** update the time axis display */
    this.axis_g
        .call(this.axis);
}
