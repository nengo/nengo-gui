/**
 * Basic 2d axes set.
 *
 * @constructor
 * @param {DOMElement} parent - the element to add this component to
 * @param {Object} args
 * @param {float} args.width - the width of the axes (in pixels)
 * @param {float} args.height - the height of the axes (in pixels)
 * @param {float} args.minValue - minimum value on y-axis
 * @param {float} args.maxValue - maximum value on y-axis
 */

import * as d3 from "d3";

export class Axes2D {
    axBottom: number;
    axLeft: number;
    axRight: number;
    axTop: number;
    axisX: d3.svg.Axis;
    axisXG: d3.Selection<d3.svg.Axis>;
    axisY: d3.svg.Axis;
    axisYG: d3.Selection<d3.svg.Axis>;
    height: number;
    maxYWidth: number = 100;
    minHeight: number;
    minWidth: number;
    scaleX: d3.scale.Linear<number, number>;
    scaleY: d3.scale.Linear<number, number>;
    svg: d3.Selection<any>;
    tickPadding: number;
    tickSize: number;
    width: number;

    constructor(parent, args) {
        // Draw the plot as an SVG
        this.svg = d3.select(parent).append("svg")
            .attr("height", "100%")
            .attr("width", "100%");

        // Scales for mapping x and y values to pixels
        this.scaleX = d3.scale.linear();
        this.scaleY = d3.scale.linear();
        this.scaleY.domain([args.minValue, args.maxValue]);

        // Spacing between the graph and the outside edges (in pixels)
        this.setAxesGeometry(args.width, args.height);

        // Define the x-axis
        this.axisX = d3.svg.axis()
            .scale(this.scaleX)
            .orient("bottom")
            .ticks(2);

        this.axisXG = this.svg.append("g")
            .attr("class", "axis axisX unselectable")
            .call(this.axisX);

        // Define the y-axis
        this.axisY = d3.svg.axis()
            .scale(this.scaleY)
            .orient("left")
            .tickValues([args.minValue, args.maxValue]);

        this.axisYG = this.svg.append("g")
            .attr("class", "axis axisY unselectable")
            .call(this.axisY);
    }

    setAxesGeometry(width, height) {
        const scale = parseFloat(
            document.getElementById("main").style["font-size"]);
        this.width = width;
        this.height = height;
        this.axLeft = this.maxYWidth;
        this.axRight = width - 1.75 * scale;
        this.axBottom = height - 1.75 * scale;
        this.axTop = 1.75 * scale;

        this.tickSize = 0.4 * scale;
        this.tickPadding = 0.2 * scale;
    }

    /**
     * Adjust the graph layout due to changed size
     */
    onResize(width, height) {
        if (width < this.minWidth) {
            width = this.minWidth;
        }
        if (height < this.minHeight) {
            height = this.minHeight;
        }
        this.setAxesGeometry(width, height);

        this.scaleX.range([this.axLeft, this.axRight]);
        this.scaleY.range([this.axBottom, this.axTop]);

        // Adjust positions of x axis on resize
        this.axisX
            .tickPadding(this.tickPadding)
            .outerTickSize(this.tickSize);
        this.axisY
            .tickPadding(this.tickPadding)
            .outerTickSize(this.tickSize);

        this.axisXG.attr("transform", "translate(0," + this.axBottom + ")");
        this.axisXG.call(this.axisX);
        this.axisYG.attr("transform", "translate(" + this.axLeft + ", 0)");
        this.axisYG.call(this.axisY);
    }

    fitTicks(parent) {
        setTimeout(() => {
            const ticks = parent.div.querySelector(".tick");
            let maxW = 0;
            for (let i = 0; i < ticks.length; i++) {
                const w = (<any> ticks[i]).getBBox().width;
                if (w > maxW) {
                    maxW = w;
                }
            }
            this.maxYWidth = maxW;
            // TODO: parent?
            this.setAxesGeometry(parent.width, parent.height);
            this.onResize(parent.width, parent.height);
        }, 1);
    }
}
