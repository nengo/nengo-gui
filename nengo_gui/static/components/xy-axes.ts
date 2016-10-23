/**
 * Basic 2d axes set.
 *
 * @constructor
 * @param {DOMElement} parent - the element to add this component to
 * @param {dict} args
 * @param {float} args.width - the width of the axes (in pixels)
 * @param {float} args.height - the height of the axes (in pixels)
 * @param {float} args.min_value - minimum value on y-axis
 * @param {float} args.max_value - maximum value on y-axis
 */

import Axes2D from "./2d-axes";

export class XYAxes extends Axes2D {
    maxVal;
    minVal;

    constructor(parent, args) {
        super(parent, args);

        this.scaleX.domain([args.minValue, args.maxValue]);
        this.axisX.tickValues([args.minValue, args.maxValue]);
        this.axisX.ticks(this.axisY.ticks()[0]);

        this.minVal = args.minValue;
        this.maxVal = args.maxValue;
    }

    /**
     * Adjust the graph layout due to changed size.
     */
    onResize(width, height) {
        Axes2D.prototype.onResize.call(this, width, height);

        const xOffset = this.axBottom - this.minVal /
            (this.maxVal - this.minVal) * (this.axTop - this.axBottom);
        const yOffset = this.axLeft - this.minVal /
            (this.maxVal - this.minVal) * (this.axRight - this.axLeft);

        this.axisX_g.attr("transform", "translate(0," + xOffset + ")");
        this.axisX_g.call(this.axisX);
        this.axisY_g.attr("transform", "translate(" + yOffset + ", 0)");
        this.axisY_g.call(this.axisY);
    }
}
