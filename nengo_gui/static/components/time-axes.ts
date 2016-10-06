/**
 * 2d axes set with the horizontal axis being a time axis.
 *
 * Called by a specific component when it requires an axes set (with the
 * x-axis showing current model time).
 *
 * @constructor
 * @param {DOMElement} parent - the element to add this component to
 * @param {dict} args - A set of constructor arguments (see Axes2D)
 */

import * as $ from "jquery";

import Axes2D from "./2d-axes";

export class TimeAxes extends Axes2D {
    axisTimeEnd;
    axisTimeStart;
    displayTime;

    constructor(parent, args) {
        super(parent, args);
        this.displayTime = args.displayTime;

        this.axisX.ticks(0);

        this.axisTimeEnd = this.svg.append("text")
            .text("Time: NULL")
            .attr("class", "graphText unselectable")[0][0];
        this.axisTimeStart = this.svg.append("text")
            .text("Time: NULL")
            .attr("class", "graphText unselectable")[0][0];

        if (this.displayTime === false) {
            this.axisTimeStart.setAttribute("display", "none");
            this.axisTimeEnd.setAttribute("display", "none");
        }
    }

    setTimeRange(start, end) {
        this.scaleX.domain([start, end]);
        this.axisTimeStart.textContent = start.toFixed(3);
        this.axisTimeEnd.textContent = end.toFixed(3);
        this.axisX_g.call(this.axisX);
    }

    onResize(width, height) {
        Axes2D.prototype.onResize.call(this, width, height);

        const scale = parseFloat($("#main").css("font-size"));
        const suppressionWidth = 6 * scale;
        const textOffset = 1.2 * scale;

        if (width < suppressionWidth || this.displayTime === false) {
            this.axisTimeStart.setAttribute("display", "none");
        } else {
            this.axisTimeStart.setAttribute("display", "block");
        }

        this.axisTimeStart.setAttribute("x", this.axLeft - textOffset);
        this.axisTimeStart.setAttribute("y", this.axBottom + textOffset);
        this.axisTimeEnd.setAttribute("x", this.axRight - textOffset);
        this.axisTimeEnd.setAttribute("y", this.axBottom + textOffset);
    }
}
