/**
 * 2d axes set with the horizontal axis being a time axis.
* @constructor
 *
 * @param {dict} args - A set of constructor arguments (see Nengo.Axes2D)
 *
 * Called by a specific component when it requires an axes set (with the 
 * x-axis showing current model time).
 */

Nengo.TimeAxes = function(parent, args) {
    Nengo.Axes2D.call(this, parent, args);
    var self = this;
    this.display_time = args.display_time;


    this.axis_x.ticks(0);

    this.axis_time_end =this.svg.append("text")
                    .text("Time: NULL")
                    .attr('class', 'graph_text unselectable')[0][0];
    this.axis_time_start =this.svg.append("text")
                    .text("Time: NULL")
                    .attr('class','graph_text unselectable')[0][0];

    if (this.display_time == false) {
        this.axis_time_start.style.display = 'none';
        this.axis_time_end.style.display = 'none';
    }
};
Nengo.TimeAxes.prototype = Object.create(Nengo.Axes2D.prototype);
Nengo.TimeAxes.prototype.constructor = Nengo.TimeAxes;

Nengo.TimeAxes.prototype.set_time_range = function(start, end) {
    this.scale_x.domain([start, end]);
    this.axis_time_start.textContent = start.toFixed(3);
    this.axis_time_end.textContent = end.toFixed(3);
    this.axis_x_g.call(this.axis_x);
};

Nengo.TimeAxes.prototype.on_resize = function(width, height) {
    Nengo.Axes2D.prototype.on_resize.call(this, width, height);

    scale = parseFloat($('#main').css('font-size'));
    var suppression_width = 6 * scale;
    var text_offset = 1.2 * scale;

    if (width < suppression_width || this.display_time == false){
        this.axis_time_start.style.display = 'none';
    } else {
        this.axis_time_start.style.display = 'block';
    }

    this.axis_time_start.setAttribute('y', this.ax_bottom + text_offset);
    this.axis_time_start.setAttribute('x', this.ax_left - text_offset);
    this.axis_time_end.setAttribute('y', this.ax_bottom + text_offset);
    this.axis_time_end.setAttribute('x', this.ax_right - text_offset);
};
