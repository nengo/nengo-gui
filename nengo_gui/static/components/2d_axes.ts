/**
 * Basic 2d axes set.
 *
 * @constructor
 * @param {DOMElement} parent - the element to add this component to
 * @param {Object} args
 * @param {float} args.width - the width of the axes (in pixels)
 * @param {float} args.height - the height of the axes (in pixels)
 * @param {float} args.min_value - minimum value on y-axis
 * @param {float} args.max_value - maximum value on y-axis
 */

import * as d3 from "d3";
import * as $ from "jquery";

export class Axes2D {
    ax_bottom: number;
    ax_left: number;
    ax_right: number;
    ax_top: number;
    axis_x: d3.svg.Axis;
    axis_x_g: d3.Selection<d3.svg.Axis>;
    axis_y: d3.svg.Axis;
    axis_y_g: d3.Selection<d3.svg.Axis>;
    height: number;
    max_y_width: number = 100;
    min_height: number;
    min_width: number;
    scale_x: d3.scale.Linear<number, number>;
    scale_y: d3.scale.Linear<number, number>;
    svg: d3.Selection<any>;
    tick_padding: number;
    tick_size: number;
    width: number;

    constructor(parent, args) {
        // Draw the plot as an SVG
        this.svg = d3.select(parent).append("svg")
            .attr("height", "100%")
            .attr("width", "100%");

        // Scales for mapping x and y values to pixels
        this.scale_x = d3.scale.linear();
        this.scale_y = d3.scale.linear();
        this.scale_y.domain([args.min_value, args.max_value]);

        // Spacing between the graph and the outside edges (in pixels)
        this.set_axes_geometry(args.width, args.height);

        // Define the x-axis
        this.axis_x = d3.svg.axis()
            .scale(this.scale_x)
            .orient("bottom")
            .ticks(2);

        this.axis_x_g = this.svg.append("g")
            .attr("class", "axis axis_x unselectable")
            .call(this.axis_x);

        // Define the y-axis
        this.axis_y = d3.svg.axis()
            .scale(this.scale_y)
            .orient("left")
            .tickValues([args.min_value, args.max_value]);

        this.axis_y_g = this.svg.append("g")
            .attr("class", "axis axis_y unselectable")
            .call(this.axis_y);
    }

    set_axes_geometry(width, height) {
        const scale = parseFloat($("#main").css("font-size"));
        this.width = width;
        this.height = height;
        this.ax_left = this.max_y_width;
        this.ax_right = width - 1.75 * scale;
        this.ax_bottom = height - 1.75 * scale;
        this.ax_top = 1.75 * scale;

        this.tick_size = 0.4 * scale;
        this.tick_padding = 0.2 * scale;
    }

    /**
     * Adjust the graph layout due to changed size
     */
    on_resize(width, height) {
        if (width < this.min_width) {
            width = this.min_width;
        }
        if (height < this.min_height) {
            height = this.min_height;
        }
        this.set_axes_geometry(width, height);

        this.scale_x.range([this.ax_left, this.ax_right]);
        this.scale_y.range([this.ax_bottom, this.ax_top]);

        // Adjust positions of x axis on resize
        this.axis_x
            .tickPadding(this.tick_padding)
            .outerTickSize(this.tick_size);
        this.axis_y
            .tickPadding(this.tick_padding)
            .outerTickSize(this.tick_size);

        this.axis_x_g.attr("transform", "translate(0," + this.ax_bottom + ")");
        this.axis_x_g.call(this.axis_x);
        this.axis_y_g.attr("transform", "translate(" + this.ax_left + ", 0)");
        this.axis_y_g.call(this.axis_y);
    }

    fit_ticks(parent) {
        setTimeout(() => {
            const ticks = $(parent.div).find(".tick");
            let max_w = 0;
            for (let i = 0; i < ticks.length; i++) {
                const w = (<any> ticks[i]).getBBox().width;
                if (w > max_w) {
                    max_w = w;
                }
            }
            this.max_y_width = max_w;
            // TODO: parent?
            this.set_axes_geometry(parent.width, parent.height);
            this.on_resize(parent.width, parent.height);
        }, 1);
    }
}
