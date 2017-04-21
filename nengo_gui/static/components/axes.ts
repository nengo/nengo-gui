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

import { Axes2DView, TimeAxesView } from "./views/axes";

export class Axes2D {
    // TODO: what should these actually be?
    static minHeight: number = 20;
    static minWidth: number = 20;

    axisX: d3.svg.Axis;
    axisY: d3.svg.Axis;
    scaleX: d3.scale.Linear<number, number>;
    scaleY: d3.scale.Linear<number, number>;

    interactable;
    view: Axes2DView;

    protected _height: number;
    protected _width: number;

    // TODO: probably don't have width, height passed in? get from view?
    constructor(view, width, height, minValue, maxValue) {
        this.view = view;

        // Scales for mapping x and y values to pixels
        this.scaleX = d3.scale.linear();
        this.scaleY = d3.scale.linear();
        this.scaleY.domain([minValue, maxValue]);

        // Define the x-axis
        this.axisX = d3.svg.axis()
            .scale(this.scaleX)
            .orient("bottom")
            .ticks(2);
        this.axisX(d3.select(this.view.axisX));

        // Define the y-axis
        this.axisY = d3.svg.axis()
            .scale(this.scaleY)
            .orient("left")
            .tickValues([minValue, maxValue]);
        this.axisY(d3.select(this.view.axisY));

        this.scale = [width, height];

        // Set up mouse handlers for crosshairs
        this.view.root.addEventListener("mouseover", () => {
            this.view.crosshair.visible = true;
        });
        this.view.root.addEventListener("mouseout", () => {
            this.view.crosshair.visible = false;
        });
        this.view.root.addEventListener("mousemove", (event: MouseEvent) => {
            // TODO: I don't like having ifs here.
            //       Make a smaller rectangle for mouseovers
            // if (x > this.axes.axLeft && x < this.axes.axRight &&
            //     y > this.axes.axTop && y < this.axes.axBottom) {
            //     make visible
            const [x, y] = [event.clientX, event.clientY];
            this.view.crosshair.pos = [x, y];
            this.view.crosshair.value = [
                this.scaleX.invert(x), this.scaleY.invert(y),
            ];
        });

        // TODO: previosly, we hid on mouse wheel... should we?
        // this.view.root.addEventListener("mousewheel", () => {
        //     this.view.crosshairPos = ;
        // });
    }

    get height(): number {
        return this._height;
    }

    set scale(val: [number, number]) {
        this._width = Math.max(Axes2D.minWidth, val[0]);
        this._height = Math.max(Axes2D.minHeight, val[1]);

        const scale = this.view.fontSize;
        const bottom = this._height - 1.75 * scale;
        const left = this.view.yPadding;
        const right = this._width - 1.75 * scale;
        const top = 1.75 * scale;

        this.view.xPadding = bottom;
        this.view.scale = [right, top];
        this.scaleX.range([left, right]);
        this.scaleY.range([bottom, top]);

        const tickSize = 0.4 * scale;
        const tickPadding = 0.2 * scale;
        this.axisX.tickPadding(tickPadding).outerTickSize(tickSize);
        this.axisY.tickPadding(tickPadding).outerTickSize(tickSize);

        this.axisX(d3.select(this.view.axisX));
        this.axisY(d3.select(this.view.axisY));
    }

    get width(): number {
        return this._width;
    }

    set yTicks(val: [number, number]) {
        this.axisY.tickValues(val);
        this.view.yPadding = this.view.yTickWidth;
        // TODO: parent?
        // this.scale = [parent.width, parent.height];
    }
}

export class XYAxes extends Axes2D {
    maxVal: number;
    minVal: number;

    constructor(view, width, height, minValue, maxValue) {
        super(view, width, height, minValue, maxValue);

        this.scaleX.domain([minValue, maxValue]);
        this.axisX.tickValues([minValue, maxValue]);
        this.axisX.ticks(this.axisY.ticks()[0]);

        this.minVal = minValue;
        this.maxVal = maxValue;
    }

    set scale(val: [number, number]) {
        this._width = Math.max(Axes2D.minWidth, val[0]);
        this._height = Math.max(Axes2D.minHeight, val[1]);

        const scale = this.view.fontSize;
        const bottom = this._height - 1.75 * scale;
        const left = this.view.yPadding;
        const right = this._width - 1.75 * scale;
        const top = 1.75 * scale;

        // --- Differs from super class
        this.view.xPadding = bottom - this.minVal /
            (this.maxVal - this.minVal) * (top - bottom);
        this.view.yPadding = left - this.minVal /
            (this.maxVal - this.minVal) * (right - left);
        // --- End differences

        const tickSize = 0.4 * scale;
        const tickPadding = 0.2 * scale;

        this.scaleX.range([left, right]);
        this.scaleY.range([bottom, top]);

        this.axisX.tickPadding(tickPadding).outerTickSize(tickSize);
        this.axisY.tickPadding(tickPadding).outerTickSize(tickSize);

        this.axisX(d3.select(this.view.axisX));
        this.axisY(d3.select(this.view.axisY));
    }
}

export class TimeAxes extends Axes2D {
    displayTime: boolean;

    view: TimeAxesView;

    constructor(view, width, height, minValue, maxValue, timeVisible) {
        super(view, width, height, minValue, maxValue);
        this.axisX.ticks(0);
        this.timeVisible = timeVisible
    }

    set scale(val: [number, number]) {
        this._width = Math.max(Axes2D.minWidth, val[0]);
        this._height = Math.max(Axes2D.minHeight, val[1]);

        const scale = this.view.fontSize;
        const bottom = this._height - 1.75 * scale;
        const left = this.view.yPadding;
        const right = this._width - 1.75 * scale;
        const top = 1.75 * scale;

        this.view.xPadding = bottom;

        const tickSize = 0.4 * scale;
        const tickPadding = 0.2 * scale;

        this.scaleX.range([left, right]);
        this.scaleY.range([bottom, top]);

        this.axisX.tickPadding(tickPadding).outerTickSize(tickSize);
        this.axisY.tickPadding(tickPadding).outerTickSize(tickSize);

        this.axisX(d3.select(this.view.axisX));
        this.axisY(d3.select(this.view.axisY));

        // --- Subclass specific starts here
        const suppressionWidth = 6 * scale;
        const textOffset = 1.2 * scale;

        if (this.timeVisible) {
            if (this._width < suppressionWidth) {
                this.view.timeStart.style.display = "none";
            } else {
                this.view.timeStart.style.display = "";
            }
        }

        this.view.startPos = [left - textOffset, bottom + textOffset];
        this.view.endPos = [right - textOffset, bottom + textOffset];
    }

    get timeRange(): [number, number] {
        return this.view.timeRange;
    }

    set timeRange(val: [number, number]) {
        const [start, end] = val;
        this.scaleX.domain([start, end]);
        this.axisX(d3.select(this.view.axisX));
    }

    get timeVisible(): boolean {
        return this.view.timeVisible;
    }

    set timeVisible(val: boolean) {
        this.view.timeVisible = val;
    }
}
