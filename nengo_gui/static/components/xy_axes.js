/**
 * Basic 2d axes set.
 * @constructor
 *
 * @param {float} args.width - the width of the axes (in pixels)
 * @param {float} args.height - the height of the axes (in pixels)
 * @param {array} args.x_range - minimum and maximum value on x-axis
 * @param {array} args.y_range - minimum and maximum value on y-axis
 */

Nengo.XYAxes = function(parent, args) {
    Nengo.Axes2D.call(this, parent, args);
};

Nengo.XYAxes.prototype = Object.create(Nengo.Axes2D.prototype);
Nengo.XYAxes.prototype.constructor = Nengo.XYAxes;

/**
 * Adjust the graph layout due to changed size
 */
Nengo.XYAxes.prototype.on_resize = function(width, height) {
    // TODO: This is what needs to be changed
    var x_offset = (this.ax_bottom + this.ax_top) / 2;
    var y_offset = (this.ax_left + this.ax_right) / 2;
    Nengo.Axes2D.prototype.on_resize.call(this, width, height, x_offset, y_offset);
};
