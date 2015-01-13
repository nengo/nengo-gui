
VIZ.SimControl = function(div, args) {
    div.classList.add('sim_control');    
    this.div = div;
    
    this.height = div.clientHeight;
    
    this.time = 0.0;
    this.rate = 0.0;
    this.pending_update = false;
    this.paused = false;
    this.built = false;
    
    this.id = args.id;
    var self = this;
    
    this.ws = new WebSocket('ws://localhost:8080/viz_component?id=' + this.id);
    this.ws.binaryType = "arraybuffer";
    this.ws.onmessage = function(event) {self.on_message(event);}
    

    this.time_slider = new VIZ.TimeSlider({parent: this.div, control: this, x: 200, y: 10, 
                                           width: this.div.clientWidth-300, height: this.div.clientHeight-20});
    
    var self = this;
    this.pause_button = document.createElement('button');
    this.pause_button.innerHTML='Pause';
    this.pause_button.onclick = function(event) {self.on_pause_click();};
    div.appendChild(this.pause_button);
    
    this.rate_div = document.createElement('div');
    div.appendChild(this.rate_div);
    this.ticks_div = document.createElement('div');
    div.appendChild(this.ticks_div);
    
    this.listeners = [];
    
    
};

VIZ.SimControl.prototype.on_message = function(event) {
    var data = new Float32Array(event.data);
    this.time = data[0];
    this.rate = data[1];

    if (this.pending_update == false) {
        this.pending_update = true;
        var self = this;
        window.setTimeout(function() {self.update()}, 10);
    }
};    

VIZ.SimControl.prototype.register_listener = function(func) {
    this.listeners.push(func);
};
    
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
        this.pause_button.innerHTML = 'Pause';
    } else {
        this.ws.send('pause');
        this.paused = true;
        this.pause_button.innerHTML = 'Continue';
    }
};

VIZ.TimeSlider = function(args) {
    this.shown_time = args.shown_time || 0.5;
    this.kept_time = args.kept_time || 4.0;
    this.last_time = 0.0;
    this.control = args.control;
    this.first_shown_time = this.last_time - this.shown_time;
    
    this.kept_scale = d3.scale.linear();
    
    this.div = document.createElement('div');
    this.div.classList.add('time_slider');
    this.div.style.position = 'fixed';
    args.parent.appendChild(this.div);
    this.div.style.width = args.width;
    this.div.style.height = args.height;
    this.kept_scale.range([0, args.width]);
    this.div.style.webkitTransform = 
        this.div.style.transform = 'translate(' + args.x + 'px, ' + args.y + 'px)';

    this.shown_div = document.createElement('div');
    this.shown_div.classList.add('shown_time');
    this.shown_div.style.position = 'fixed';
    this.div.appendChild(this.shown_div);
    this.shown_div.style.height = args.height;
    this.shown_div.style.width = args.width * this.shown_time / this.kept_time;

    var self = this;
    
        interact(this.shown_div)
            .draggable({
                    onmove: function (event) {
                    
                    var x = self.kept_scale(self.first_shown_time) + event.dx;
                    
                    var new_time = self.kept_scale.invert(x);
                    if (new_time > self.last_time - self.shown_time) {
                        new_time = self.last_time - self.shown_time;
                    }
                    if (new_time < self.last_time - self.kept_time) {
                        new_time = self.last_time - self.kept_time;
                    }
                    
                    self.first_shown_time = new_time;
                    
                    x = self.kept_scale(new_time);
                    
                    // translate the element
                    event.target.style.webkitTransform =
                        event.target.style.transform =
                        'translate(' + x + 'px, 0px)';
                        
                    for (var i = 0; i < self.control.listeners.length; i++) {
                        self.control.listeners[i]();
                    }
                        
                }
            })
    
    

        
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

VIZ.TimeSlider.prototype.update_times = function(time) {
    var delta = time - this.last_time; 
    this.last_time = time;
    this.first_shown_time = this.first_shown_time + delta;

    this.kept_scale.domain([time - this.kept_time, time]);
    
    var x = this.kept_scale(this.first_shown_time);
    this.shown_div.style.webkitTransform = 
        this.shown_div.style.transform = 'translate(' + x + 'px, 0px)';
    //this.shown_div.style.width = this.div.clientWidth - x;

    this.axis_g
        .call(this.axis);
        
    
}
