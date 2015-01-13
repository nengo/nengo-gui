
VIZ.Value = function(args) {
    VIZ.WSComponent.call(this, args);
    
    this.time_control = args.time_control;
    
    this.n_lines = args.n_lines || 1;
    this.data = [];
    for (var i=0; i < this.n_lines; i++) {
        this.data.push([]);
    }
    this.times = [];
        
    //TODO: get this data from this.time_control    
    this.storage_limit = 4000;
    this.shown_time = 0.5;
    this.first_shown_index = 0;
    this.last_shown_index = 0;
    
    this.synapse = 0.01;
    
    this.svg = d3.select(this.div).append('svg')
        .attr('width', '100%')
        .attr('height', '100%');
        
    this.scale_x = d3.scale.linear();
    this.scale_y = d3.scale.linear();
    this.scale_y.domain([args.miny || -1, args.maxy || 1]);
    
    this.margin_top = 10;
    this.margin_bottom = 40;
    this.margin_left = 40;
    this.margin_right = 10;
    
    this.scale_x.range([this.margin_left, args.width - this.margin_right]);
    this.scale_y.range([args.height - this.margin_bottom, this.margin_top]);
    
    
    this.axis_x = d3.svg.axis()
        .scale(this.scale_x)
        .orient("bottom")
        .ticks(1);

    this.axis_y = d3.svg.axis()
        .scale(this.scale_y)
        .orient("left")    
        .ticks(2);

    this.axis_y_g = this.svg.append("g")
        .attr("class", "axis axis_y")
        .attr("transform", "translate(" + this.margin_left+ ", 0)")
        .call(this.axis_y);

        
    this.axis_x_g = this.svg.append("g")
        .attr("class", "axis axis_x")
        .attr("transform", "translate(0," + (args.height - this.margin_bottom) + ")")
        .call(this.axis_x);
        
    var self = this;

    this.time_control.register_listener(function() {self.schedule_update();});
    
    var line = d3.svg.line()
        .x(function(d, i) {return self.scale_x(times[i]);})
        .y(function(d) {return self.scale_y(d);})

    var path = this.svg.append("g").selectAll('path').data(this.data);
    this.path = path;
    path.enter().append('path')
        .attr('class', 'line')
        .attr('d', line);    
        
    this.pending_update = false;
};

VIZ.Value.prototype = Object.create(VIZ.WSComponent.prototype);
VIZ.Value.prototype.constructor = VIZ.Value;

VIZ.Value.prototype.schedule_update = function(event) {
    if (this.pending_update == false) {
        this.pending_update = true;
        var self = this;
        window.setTimeout(function() {self.update_lines()}, 10);
    }
}

VIZ.Value.prototype.on_message = function(event) {
    var data = new Float32Array(event.data);

    var decay = 0.0;    
    if (this.times.length != 0) {
        var dt = data[0] - this.times[this.times.length - 1];
        decay = Math.exp(-dt / this.synapse);
    }
    
    for (var i = 0; i < this.data.length; i++) {
        if (decay == 0.0) {
            this.data[i].push(data[i + 1]);        
        } else {
            this.data[i].push(data[i + 1]*(1-decay) + this.data[i][this.data[i].length - 1] * decay);
        }
    }
    this.times.push(data[0]);
    
    this.schedule_update();
}
    
VIZ.Value.prototype.update_lines = function() {
    this.pending_update = false;
    
    var last_time = this.times[this.times.length - 1];
    
    var extra = this.times.length - this.storage_limit;
    if (extra > 0) {
        this.times = this.times.slice(extra);
        for (var i = 0; i < this.n_lines; i++) {
            this.data[i] = this.data[i].slice(extra);
        }
        this.first_shown_index = this.first_shown_index - extra;
        this.last_shown_index = this.last_shown_index - extra;
    }
    while (this.times[this.first_shown_index] < last_time - this.shown_time) {
        this.first_shown_index = this.first_shown_index + 1;
    }
    this.last_shown_index = this.times.length - 1;
    
    this.scale_x.domain([last_time - 0.5, last_time]);
    
    
    var self = this;
    
    var line = d3.svg.line()
            .x(function(d, i) {return self.scale_x(self.times[i + self.first_shown_index]);})
            .y(function(d) {return self.scale_y(d);})
    this.path.data(this.get_shown_data())
             .attr('d', line);
             
    this.axis_x_g.call(this.axis_x);         
};

VIZ.Value.prototype.get_shown_data = function() {
    var t1 = this.time_control.time_slider.first_shown_time;
    var t2 = t1 + this.time_control.time_slider.shown_time;
    
    var index = 0;
    while (this.times[index] < t1) {
        index += 1;
    }
    var last_index = 0;
    while (this.times[last_index] < t2 && last_index < this.times.length) {
        last_index += 1;
    }
    this.first_shown_index = index;
    this.scale_x.domain([t1, t2]);

    var shown = [];
    for (var i = 0; i < this.data.length; i++) {
        shown.push(this.data[i].slice(index, last_index));
    }
    return shown
}

VIZ.Value.prototype.on_resize = function(width, height) {
    this.scale_x.range([this.margin_left, width - this.margin_right]);
    this.scale_y.range([height - this.margin_bottom, this.margin_top]);
    var self = this;
    var line = d3.svg.line()
        .x(function(d, i) {return self.scale_x(self.times[i + self.first_shown_index]);})
        .y(function(d) {return self.scale_y(d);})
    this.path.data(this.get_shown_data())
             .attr('d', line);
    this.axis_x_g         
        .attr("transform", "translate(0," + (height - this.margin_bottom) + ")")
        .call(this.axis_x);
    this.axis_y_g.call(this.axis_y);         
};
