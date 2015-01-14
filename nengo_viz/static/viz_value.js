/**
 * Line graph showing decoded values over time
 * @constructor
 *
 * @param {dict} args - A set of constructor arguments (see VIZ.Component)
 * @param {int} n_lines - number of decoded values
 */
VIZ.Value = function(args) {
    VIZ.Component.call(this, args);
    var self = this;

    this.n_lines = args.n_lines || 1;
    this.sim = args.sim;

    this.data_store = new VIZ.DataStore(this.n_lines, this.sim, 0.01);

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
        

    this.sim.div.addEventListener('adjust_time', 
            function(e) {self.schedule_update();}, false);
    
    var line = d3.svg.line()
        .x(function(d, i) {return self.scale_x(times[i]);})
        .y(function(d) {return self.scale_y(d);})

    var path = this.svg.append("g").selectAll('path').data(this.data_store.data);
    this.path = path;
    path.enter().append('path')
        .attr('class', 'line');
        
    this.pending_update = false;
};

VIZ.Value.prototype = Object.create(VIZ.Component.prototype);
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
    this.data_store.push(data);
    this.schedule_update();
}
    
VIZ.Value.prototype.update_lines = function() {
    this.pending_update = false;
    
    this.data_store.update();
        
    var t1 = this.sim.time_slider.first_shown_time;
    var t2 = t1 + this.sim.time_slider.shown_time;
    this.scale_x.domain([t1, t2]);
    
    var self = this;
    
    var shown_data = this.data_store.get_shown_data();
    var line = d3.svg.line()
        .x(function(d, i) {return self.scale_x(self.data_store.times[i + self.data_store.first_shown_index]);})
            .y(function(d) {return self.scale_y(d);})
    this.path.data(shown_data)
             .attr('d', line);
             
    this.axis_x_g.call(this.axis_x);         
};

VIZ.Value.prototype.on_resize = function(width, height) {
    this.scale_x.range([this.margin_left, width - this.margin_right]);
    this.scale_y.range([height - this.margin_bottom, this.margin_top]);
    var self = this;
    var shown_data = this.data_store.get_shown_data();
    var line = d3.svg.line()
        .x(function(d, i) {return self.scale_x(self.data_store.times[i + self.data_store.first_shown_index]);})
        .y(function(d) {return self.scale_y(d);})
    this.path.data(shown_data)
             .attr('d', line);
    this.axis_x_g         
        .attr("transform", "translate(0," + (height - this.margin_bottom) + ")")
        .call(this.axis_x);
    this.axis_y_g.call(this.axis_y);         
};
