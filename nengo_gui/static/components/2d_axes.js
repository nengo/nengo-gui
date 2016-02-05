/**
 * Basic 2d axes set.
 * @constructor
 *
 * @param {DOMElement} parent - the element to add this component to
 * @param {float} args.width - the width of the axes (in pixels)
 * @param {float} args.height - the height of the axes (in pixels)
 * @param {array} args.x_range - minimum and maximum value on x-axis
 * @param {array} args.y_range - minimum and maximum value on y-axis
 */

Nengo.Axes2D = function(parent, args) {
    var self = this;

    this.max_y_width = 100;

    /** draw the plot as an SVG */
    this.svg = d3.select(parent).append('svg')
        .attr('width', '100%')
        .attr('height', '100%');

    /** scales for mapping x and y values to pixels */
    this.scale_x = d3.scale.linear();
    this.scale_y = d3.scale.linear();
    if(args.x_range !== undefined){
        this.scale_x.domain([args.x_range[0], args.x_range[1]]);
    }
    this.scale_y.domain([args.y_range[0], args.y_range[1]]);

    /** spacing between the graph and the outside edges (in pixels) */
    this.set_axes_geometry(args.width, args.height);

    /** define the x-axis */
    this.axis_x = d3.svg.axis()
        .scale(this.scale_x)
        .orient("bottom")
    if(args.x_range !== undefined){
        this.axis_x.tickValues([args.x_range[0], args.x_range[1]]);
    } else {
        this.axis_x.ticks(2);
    }
    this.axis_x_g = this.svg.append("g")
        .attr("class", "axis axis_x unselectable")
        .call(this.axis_x);

    /** define the y-axis */
    this.axis_y = d3.svg.axis()
        .scale(this.scale_y)
        .orient("left")
        .tickValues([args.y_range[0], args.y_range[1]]);

    this.axis_y_g = this.svg.append("g")
        .attr("class", "axis axis_y unselectable")
        .call(this.axis_y);
};

Nengo.Axes2D.prototype.set_axes_geometry = function(width, height) {
    scale = parseFloat($('#main').css('font-size'));
    this.width = width;
    this.height = height;
    this.ax_left = this.max_y_width;
    this.ax_right = width - 1.75 * scale;
    this.ax_bottom = height - 1.75 * scale;
    this.ax_top = 1.75 * scale;

    this.tick_size = 0.4 * scale;
    this.tick_padding = 0.2 * scale;
};

/**
 * Adjust the graph layout due to changed size
 */
Nengo.Axes2D.prototype.on_resize = function(width, height, x_offset, y_offset) {
    if (width < this.minWidth) {
        width = this.minWidth;
    }
    if (height < this.minHeight) {
        height = this.minHeight;
    };
    this.set_axes_geometry(width, height);

    this.scale_x.range([this.ax_left, this.ax_right]);
    this.scale_y.range([this.ax_bottom, this.ax_top]);

    //Adjust positions of x axis on resize
    this.axis_x
        .tickPadding(this.tick_padding)
        .outerTickSize(this.tick_size, this.tick_size);
    this.axis_y
        .tickPadding(this.tick_padding)
        .outerTickSize(this.tick_size, this.tick_size);

    this.axis_x_g.attr("transform", "translate(0," + x_offset + ")");
    this.axis_x_g.call(this.axis_x);
    this.axis_y_g.attr("transform", "translate(" + y_offset + ", 0)");
    this.axis_y_g.call(this.axis_y);
};

Nengo.Axes2D.prototype.fit_ticks = function(parent){
    var self = this;
    setTimeout(function(){
        var ticks = $(parent.div).find('.tick');
        var max_w = 0;
        for (var i = 0; i < ticks.length; i++) {
            var w = ticks[i].getBBox().width;
            if (w > max_w) {
                max_w = w;
            }
        }
        self.max_y_width = max_w;
        self.set_axes_geometry();
        self.on_resize(parent.width, parent.height);
    }, 1)
}
