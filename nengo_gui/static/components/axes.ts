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

import { AxesView } from "./views/axes";
import { ValueView } from "./views/value";

export class Axis {
    private axis: d3.svg.Axis;
    private g: d3.Selection<SVGGElement>;
    private _scale: d3.scale.Linear<number, number>;

    constructor(xy: "X" | "Y", g: SVGGElement, lims: [number, number]) {
        this._scale = d3.scale.linear();
        this.axis = d3.svg.axis()
        this.axis.orient(xy === "X" ? "bottom" : "left");
        this.axis.scale(this._scale);
        this.g = d3.select(g);
        this.lims = lims;
    }

    get lims(): [number, number] {
        const lims = this._scale.domain() as [number, number];
        console.assert(lims.length === 2);
        return lims;
    }

    set lims(val: [number, number]) {
        this._scale.domain(val);
        this.axis.tickValues(val);
        this.axis(this.g);
    }

    get scale(): [number, number] {
        const scale = this._scale.range() as [number, number];
        console.assert(scale.length === 2);
        return scale;
    }

    set scale(val: [number, number]) {
        this._scale.range(val);
        this.axis(this.g);
    }

    get tickSize(): number {
        return this.axis.outerTickSize();
    }

    set tickSize(val: number) {
        // .tickPadding(val * 0.5)
        this.axis.outerTickSize(val);
    }

    pixelAt(value: number) {
        return this._scale(value);
    }

    valueAt(pixel: number) {
        return this._scale.invert(pixel);
    }
}

export class Axes {
    // TODO: what should these actually be?
    static minHeight: number = 20;
    static minWidth: number = 20;

    x: Axis;
    y: Axis;

    view: AxesView;

    protected _height: number;
    protected _width: number;

    // TODO: have left xtick disappear if too close to right xtick?

    // TODO: probably don't have width, height passed in? get from view?
    constructor(valueView: ValueView, width, height, minValue, maxValue) {
        this.view = valueView.axes;
        this._width = width;
        this._height = height;

        // TODO: better initial values for x?
        this.x = new Axis("X", this.view.x.g, [-0.5, 0.0]);
        this.y = new Axis("Y", this.view.y.g, [minValue, maxValue]);

        // Set up mouse handlers for crosshairs
        valueView.overlay.addEventListener("mouseover", () => {
            this.view.crosshair.visible = true;
        });
        valueView.overlay.addEventListener("mouseout", () => {
            this.view.crosshair.visible = false;
        });
        valueView.overlay.addEventListener("mousemove", (event: MouseEvent) => {
            const [offsetX, offsetY] = valueView.pos;
            const [x, y] = [event.x - offsetX, event.y - offsetY];
            this.view.crosshair.pos = [x, y];
            this.view.crosshair.value = [this.x.valueAt(x), this.y.valueAt(y)];
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
        this._width = Math.max(Axes.minWidth, val[0]);
        this._height = Math.max(Axes.minHeight, val[1]);

        const [xWidth, xHeight] = this.view.x.scale;
        const [yWidth, yHeight] = this.view.y.scale;

        // TOOD: why 0 and not yWidth?
        this.view.x.pos = [0, this._height - xHeight];
        this.x.scale = [yWidth, this._width];
        this.view.y.pos = [yWidth, 0];
        this.y.scale = [this._height - xHeight, 0];
        this.view.crosshair.scale = [
            this._width, this._height - xHeight
        ];
    }

    get width(): number {
        return this._width;
    }

    ondomadd() {
        this.scale = [this._width, this._height];
        const yWidth = this.view.y.scale[0];
        this.view.crosshair.offset = [0, yWidth];
        this.x.tickSize = 0.4 * yWidth;
        this.y.tickSize = 0.4 * yWidth;
    }
}

// export class XYAxes extends Axes {
//     maxVal: number;
//     minVal: number;

//     constructor(valueView, width, height, minValue, maxValue) {
//         super(valueView, width, height, minValue, maxValue);

//         this.scaleX.domain([minValue, maxValue]);
//         this.axisX.tickValues([minValue, maxValue]);
//         this.axisX.ticks(this.axisY.ticks()[0]);

//         this.minVal = minValue;
//         this.maxVal = maxValue;
//     }

//     set scale(val: [number, number]) {
//         this._width = Math.max(Axes.minWidth, val[0]);
//         this._height = Math.max(Axes.minHeight, val[1]);

//         const scale = this.view.fontSize;
//         const bottom = this._height - 1.75 * scale;
//         const left = this.view.yPadding;
//         const right = this._width - 1.75 * scale;
//         const top = 1.75 * scale;

//         this.view.scale = [right, top];
//         this.scaleX.range([left, right]);
//         this.scaleY.range([bottom, top]);

//         const tickSize = 0.4 * scale;
//         const tickPadding = 0.2 * scale;
//         this.axisX.tickPadding(tickPadding).outerTickSize(tickSize);
//         this.axisY.tickPadding(tickPadding).outerTickSize(tickSize);

//         this.axisX(d3.select(this.view.axisX));
//         this.axisY(d3.select(this.view.axisY));

//         this.view.xPadding = bottom - this.minVal /
//             (this.maxVal - this.minVal) * (top - bottom);
//         this.view.yPadding = left - this.minVal /
//             (this.maxVal - this.minVal) * (right - left);
//     }
// }

// export class TimeAxes extends Axes {
//     // constructor(valueView, width, height, minValue, maxValue, timeVisible) {
//     //     super(valueView, width, height, minValue, maxValue);
//     //     this.timeVisible = timeVisible;
//     // }

//     // set scale(val: [number, number]) {
//     //     this._width = Math.max(Axes.minWidth, val[0]);
//     //     this._height = Math.max(Axes.minHeight, val[1]);

//     //     const [xWidth, xHeight] = this.view.x.scale;
//     //     const [yWidth, yHeight] = this.view.y.scale;

//     //     this.x.tickSize = 0.4 * yWidth;
//     //     this.y.tickSize = 0.4 * yWidth;

//     //     this.view.x.pos = [yWidth, yHeight];
//     //     this.x.scale = [yWidth, this._width];
//     //     this.view.y.pos = [yWidth, 0];
//     //     this.y.scale = [this._height - xHeight, 0];
//     //     this.view.crosshair.scale = [
//     //         this._width - yWidth, this._height - xHeight
//     //     ];

//     //     const suppressionWidth = 6 * yWidth;
//     //     const textOffset = suppressionWidth * 2;

//     //     if (this.timeVisible) {
//     //         if (this._width < suppressionWidth) {
//     //             this.view.timeStart.style.display = "none";
//     //         } else {
//     //             this.view.timeStart.style.display = "";
//     //         }
//     //     }

//     //     this.view.startPos = [left - textOffset, bottom + textOffset];
//     //     this.view.endPos = [right - textOffset, bottom + textOffset];
//     // }

//     get timeRange(): [number, number] {
//         return this.x.lims;
//     }

//     set timeRange(val: [number, number]) {
//         this.x.lims = val;
//     }

//     // get timeVisible(): boolean {
//     //     const nTicks = this.axisX.ticks();
//     //     console.log(nTicks);
//     //     return nTicks > 0;
//     // }

//     // set timeVisible(val: boolean) {
//     //     if (val) {
//     //         this.axisX.ticks(2);
//     //     } else {
//     //         this.axisX.ticks(0);
//     //     }
//     // }
// }
