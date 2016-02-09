/**
 * Basic 2d axes set.
 * @constructor
 *
 * @param {float} args.width - the width of the axes (in pixels)
 * @param {float} args.height - the height of the axes (in pixels)
 * @param {float} args.min_value - minimum value on y-axis
 * @param {float} args.max_value - maximum value on y-axis
 */

Nengo.XYAxes = function(parent, args) {
    Nengo.Axes2D.call(this, parent, args);

    this.scale_x.domain([args.min_value, args.max_value]);
    this.axis_x.tickValues([args.min_value, args.max_value]);
    this.axis_x.ticks(this.axis_y.ticks()[0]);

    this.min_val = args.min_value;
    this.max_val = args.max_value;
};

Nengo.XYAxes.prototype = Object.create(Nengo.Axes2D.prototype);
Nengo.XYAxes.prototype.constructor = Nengo.XYAxes;

/**
 * Adjust the graph layout due to changed size
 */
Nengo.XYAxes.prototype.on_resize = function(width, height) {
    Nengo.Axes2D.prototype.on_resize.call(this, width, height);

    var x_offset = this.ax_bottom - this.min_val / (this.max_val - this.min_val) * (this.ax_top - this.ax_bottom);
    var y_offset = this.ax_left - this.min_val / (this.max_val - this.min_val) * (this.ax_right - this.ax_left);

    this.axis_x_g.attr("transform", "translate(0," + x_offset + ")");
    this.axis_x_g.call(this.axis_x);
    this.axis_y_g.attr("transform", "translate(" + y_offset + ", 0)");
    this.axis_y_g.call(this.axis_y);
};
