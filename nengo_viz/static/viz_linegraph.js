
VIZ.LineGraph = function(args) {
    VIZ.WSComponent.call(this, args);
    
    this.n_lines = args.n_lines | 1;
    this.data = [];
    for (var i=0; i < this.n_lines; i++) {
        this.data.push([]);
    }
    this.times = [];
    
    this.storage_limit = 2000;
    this.shown_limit = 500;
    
    this.svg = d3.select(this.div).append('svg')
        .attr('width', '100%')
        .attr('height', '100%');
        
    this.scale_x = d3.scale.linear();
    this.scale_y = d3.scale.linear();
    this.scale_x.range([0, args.width]);
    this.scale_y.range([args.height, 0]);
    this.scale_y.domain([args.miny || -1, args.maxy || 1]);

    var self = this;
    
    var line = d3.svg.line()
        .x(function(d, i) {return self.scale_x(i);})
        .y(function(d) {return self.scale_y(d);})

    var path = this.svg.selectAll('path').data(this.data);
    this.path = path;
    path.enter().append('path')
        .attr('class', 'line')
        .attr('d', line);    
        
    this.pending_update = false;
};

VIZ.LineGraph.prototype = Object.create(VIZ.WSComponent.prototype);
VIZ.LineGraph.prototype.constructor = VIZ.LineGraph;

VIZ.LineGraph.prototype.on_message = function(event) {
    data = new Float32Array(event.data);
    console.log(data);
    for (var i = 0; i < this.data.length; i++) {
        this.data[i].push(data[i + 1]);
    }
    this.times.push(data[0]);
    
    if (this.times.length > this.storage_limit) {
        this.times = this.times.slice(-this.storage_limit);
        
        for (var i = 0; i < this.n_lines; i++) {
            this.data[i] = this.data[i].slice(-this.storage_limit);
        }
    }
    
    this.scale_x.domain([0, this.shown_limit - 1]);
    
    
    if (this.pending_update == false) {
        this.pending_update = true;
        var self = this;
        window.setTimeout(function() {self.update_lines()}, 10);
    }
}
    
VIZ.LineGraph.prototype.update_lines = function() {
    this.pending_update = false;
    
    var self = this;
    
    var line = d3.svg.line()
            .x(function(d, i) {return self.scale_x(i);})
            .y(function(d) {return self.scale_y(d);})
    this.path.data(this.get_shown_data())
             .attr('d', line);
};

VIZ.LineGraph.prototype.get_shown_data = function() {
    var shown = [];
    for (var i = 0; i < this.data.length; i++) {
        shown.push(this.data[i].slice(-this.shown_limit));
    }
    return shown
}

VIZ.LineGraph.prototype.on_resize = function(width, height) {
    this.scale_x.range([0, width]);
    this.scale_y.range([height, 0]);
    var self = this;
    var line = d3.svg.line()
        .x(function(d, i) {return self.scale_x(i);})
        .y(function(d) {return self.scale_y(d);})
    this.path.data(this.get_shown_data())
             .attr('d', line);
};
