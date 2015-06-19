/**
 * Basic 2d axes set.
 * @constructor
 *
 * @param {float} args.width - the width of the axes (in pixels)
 * @param {float} args.height - the height of the axes (in pixels)
 * @param {float} args.min_value - minimum value on y-axis
 * @param {float} args.max_value - maximum value on y-axis
 */

Nengo.Axes2D = function(parent, args) {
    var self = this;

    /** draw the plot as an SVG */
    this.svg = d3.select(parent).append('svg')
        .attr('width', '100%')
        .attr('height', '100%');

    /** scales for mapping x and y values to pixels */
    this.scale_x = d3.scale.linear();
    this.scale_y = d3.scale.linear();
    this.scale_y.domain([args.min_value, args.max_value]);

    /** spacing between the graph and the outside edges (in pixels) */
    this.set_axes_geometry(args.width, args.height);

    /** define the x-axis */
    this.axis_x = d3.svg.axis()
        .scale(this.scale_x)
        .orient("bottom")
        .ticks(2);
    this.axis_x_g = this.svg.append("g")
        .attr("class", "axis axis_x unselectable")
        .call(this.axis_x);

    /** define the y-axis */
    this.axis_y = d3.svg.axis()
        .scale(this.scale_y)
        .orient("left")
        .ticks(2)
    this.axis_y_g = this.svg.append("g")
        .attr("class", "axis axis_y unselectable")
        .call(this.axis_y);
};

Nengo.Axes2D.prototype.set_axes_geometry = function(width, height) {
    scale = parseFloat($('#main').css('font-size'));
    this.width = width;
    this.height = height;

    this.ax_left = 1.75 * scale;
    this.ax_right = width - 1.75 * scale;
    this.ax_bottom = height - 1.75 * scale;
    this.ax_top = 1.75 * scale;

    this.tick_size = 0.4 * scale;
    this.tick_padding = 0.2 * scale;
};

/**
 * Adjust the graph layout due to changed size
 */
Nengo.Axes2D.prototype.on_resize = function(width, height) {
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
    this.axis_x_g.attr("transform", "translate(0," + this.ax_bottom + ")");
    this.axis_x_g.call(this.axis_x);
    this.axis_y_g.attr("transform", "translate(" + this.ax_left + ", 0)");
    this.axis_y_g.call(this.axis_y);
};

