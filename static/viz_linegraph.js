
VIZ.LineGraph = function(args) {
    VIZ.WSComponent.call(this, args);
    this.data = [];
    
    this.svg = d3.select(this.div).append('svg')
        .attr('width', '100%')
        .attr('height', '100%');
        
    this.scale_x = d3.scale.linear();
    this.scale_y = d3.scale.linear();
    this.scale_x.range([0, args.width]);
    this.scale_y.range([args.height, 0]);

    var self = this;
    
    var line = d3.svg.line()
        .x(function(d, i) {return self.scale_x(i);})
        .y(function(d) {return self.scale_y(d);})

    this.svg.append('path')
        .datum(this.data)
        .attr('class', 'line')
        .attr('d', line);    
};

VIZ.LineGraph.prototype = Object.create(VIZ.WSComponent.prototype);
VIZ.LineGraph.prototype.constructor = VIZ.LineGraph;

VIZ.LineGraph.prototype.on_message = function(event) {
    this.data.push(parseFloat(event.data));
    
    if (this.data.length > 100) {
        this.data = this.data.slice(-100);
    }
    this.scale_x.domain([0, this.data.length - 1]);
    this.scale_y.domain([0, Math.max.apply(null, this.data)]);
    
    var self = this;
    
    var line = d3.svg.line()
            .x(function(d, i) {return self.scale_x(i);})
            .y(function(d) {return self.scale_y(d);})
    d3.select(this.div).select('path')
            .datum(this.data)
            .attr('d', line);
};

VIZ.LineGraph.prototype.on_resize = function(width, height) {
    // resize graph
    this.scale_x.range([0, width]);
    this.scale_y.range([height, 0]);
    var self = this;
    var line = d3.svg.line()
        .x(function(d, i) {return self.scale_x(i);})
        .y(function(d) {return self.scale_y(d);})
    d3.select(this.div).select('path')
        .datum(this.data)
        .attr('d', line);
};
