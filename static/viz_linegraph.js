
VIZ.LineGraph = function(args) {
    VIZ.WSComponent.call(this, args);
    
    this.n_lines = args.n_lines | 1;
    this.data = [];
    for (var i=0; i < this.n_lines; i++) {
        this.data.push([]);
    }
    
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
};

VIZ.LineGraph.prototype = Object.create(VIZ.WSComponent.prototype);
VIZ.LineGraph.prototype.constructor = VIZ.LineGraph;

VIZ.LineGraph.prototype.on_message = function(event) {
    console.log(event.data);
    msg = event.data.split(',');
    console.log([msg, msg.length, this.data.length]);
    for (var i = 0; i < msg.length; i++) {
        var value = parseFloat(msg[i]);
        this.data[i].push(value);
    }
    
    if (this.data[0].length > 100) {
        for (var i = 0; i < this.n_lines; i++) {
            this.data[i] = this.data[i].slice(-100);
        }
    }
    
    this.scale_x.domain([0, this.data[0].length - 1]);
    
    var self = this;
    
    var line = d3.svg.line()
            .x(function(d, i) {return self.scale_x(i);})
            .y(function(d) {return self.scale_y(d);})
    this.path.data(this.data)
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
    this.path.data(this.data)
             .attr('d', line);
    //d3.select(this.div).select('path')
    //    .datum(this.data)
    //    .attr('d', line);
};
