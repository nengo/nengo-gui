import { VNode, dom, h } from "maquette";

import * as utils from "../../utils";
import {
    getScale, getTranslate, setScale, setTranslate
} from "../../views/views";
import "./axes.css";

export class Crosshair {

    x: SVGGElement;
    xLine: SVGLineElement;
    xText: SVGTextElement;
    y: SVGGElement;
    yLine: SVGLineElement;
    yText: SVGTextElement;

    constructor() {
        const crosshair = (xy: "X" | "Y") =>
            h(`g.crosshair.crosshair${xy}`, {styles: {display: "none"}}, [
                h("line", {x1: "0", x2: "0", y1: "0", y2: "0"}),
                h("text", {x: "0", y: "0"}, ["0.000"]),
            ]);
        this.x = utils.domCreateSVG(crosshair("X")) as SVGGElement;
        this.y = utils.domCreateSVG(crosshair("Y")) as SVGGElement;
        this.xLine = this.x.querySelector("line");
        this.xText = this.x.querySelector("text");
        this.yLine = this.y.querySelector("line");
        this.yText = this.y.querySelector("text");
    }

    get offset(): [number, number] {
        return [
            Number(this.xLine.getAttribute("y1")),
            Number(this.yLine.getAttribute("x1")),
        ];
    }

    set offset(val: [number, number]) {
        this.xLine.setAttribute("y1", String(val[0]));
        this.yLine.setAttribute("x1", String(val[1]));
        this.yText.setAttribute("x", String(val[1])); //
    }

    get pos(): [number, number] {
        return [
            Number(this.xLine.getAttribute("x1")),
            Number(this.yLine.getAttribute("y1")),
        ];
    }

    set pos(val: [number, number]) {
        this.xLine.setAttribute("x1", String(val[0]));
        this.xLine.setAttribute("x2", String(val[0]));
        this.yLine.setAttribute("y1", String(val[1]));
        this.yLine.setAttribute("y2", String(val[1]));
        this.xText.setAttribute("x", String(val[0]));
        this.yText.setAttribute("y", String(val[1]));
    }

    get scale(): [number, number] {
        return [
            Number(this.yLine.getAttribute("x2")),
            Number(this.xLine.getAttribute("y2")),
        ];
    }

    set scale(val: [number, number]) {
        this.yLine.setAttribute("x2", String(val[0]));
        this.xLine.setAttribute("y2", String(val[1]));
        this.xText.setAttribute("y", String(val[1]));
    }

    get value(): [number, number] {
        return [
            Number(this.xText.textContent),
            Number(this.yText.textContent),
        ]
    }

    set value(val: [number, number]) {
        this.xText.textContent = val[0].toFixed(3);
        this.yText.textContent = val[1].toFixed(3);
    }

    get visible(): boolean {
        return this.x.style.display !== "none";
    }

    set visible(val: boolean) {
        if (val) {
            this.x.style.display = "";
            this.y.style.display = "";
        } else {
            this.x.style.display = "none";
            this.y.style.display = "none";
        }
    }
}

export class Axis {
    g: SVGGElement;
    orientation: "horizontal" | "vertical";

    constructor(xy: "X" | "Y") {
        const node = h(`g.axis.axis${xy}.unselectable`, {
            transform: "translate(0,0)"
        });
        this.g = utils.domCreateSVG(node) as SVGGElement;
        this.orientation = xy === "X" ? "horizontal" : "vertical";
    }

    get pos(): [number, number] {
        return getTranslate(this.g);
    }

    set pos(val: [number, number]) {
        setTranslate(this.g, val[0], val[1]);
    }

    get scale(): [number, number] {
        const bbox = this.g.getBBox();
        return [bbox.width, bbox.height];
    }
}

export class AxesView {
    x: Axis;
    y: Axis;
    crosshair: Crosshair;
    root: SVGGElement;

    constructor() {
        const node = h("g.axes");
        this.root = utils.domCreateSVG(node) as SVGGElement;
        this.x = new Axis("X");
        this.y = new Axis("Y");
        this.root.appendChild(this.x.g);
        this.root.appendChild(this.y.g);
        this.crosshair = new Crosshair();
        this.root.appendChild(this.crosshair.x);
        this.root.appendChild(this.crosshair.y);
    }

    get fontSize(): number {
        // TODO: Number doesn't work here so we use parseFloat, but feels bad
        return parseFloat(window.getComputedStyle(this.root)["font-size"]);
    }

    get scale(): [number, number] {
        const [xWidth, xHeight] = this.x.scale;
        const [yWidth, yHeight] = this.y.scale;
        return [xWidth + yWidth, xHeight + yHeight];
    }
}

// export class TimeAxesView extends AxesView {
//     timeEnd: SVGTextElement;
//     timeStart: SVGTextElement;

//     constructor() {
//         super();
//         const node = h("text.unselectable", ["0.000"]);
//         this.timeEnd = utils.domCreateSVG(node) as SVGTextElement;
//         this.timeStart = utils.domCreateSVG(node) as SVGTextElement;
//         this.root.appendChild(this.timeEnd);
//         this.root.appendChild(this.timeStart);
//     }

//     get endPos(): [number, number] {
//         return [
//             Number(this.timeEnd.getAttribute("x")),
//             Number(this.timeEnd.getAttribute("y")),
//         ]
//     }

//     set endPos(val: [number, number]) {
//         this.timeEnd.setAttribute("x", String(val[0]));
//         this.timeEnd.setAttribute("y", String(val[1]));
//     }

//     get startPos(): [number, number] {
//         return [
//             Number(this.timeStart.getAttribute("x")),
//             Number(this.timeStart.getAttribute("y")),
//         ]
//     }

//     set startPos(val: [number, number]) {
//         this.timeStart.setAttribute("x", String(val[0]));
//         this.timeStart.setAttribute("y", String(val[1]));
//     }

//     get timeRange(): [number, number] {
//         return [
//             Number(this.timeStart.textContent),
//             Number(this.timeEnd.textContent),
//         ];
//     }

//     set timeRange(val: [number, number]) {
//         const [start, end] = val;
//         this.timeStart.textContent = start.toFixed(3);
//         this.timeEnd.textContent = end.toFixed(3);
//     }

//     get timeVisible(): boolean {
//         return this.timeEnd.style.display === "";
//     }

//     set timeVisible(val: boolean) {
//         if (val) {
//             this.timeEnd.style.display = "";
//             this.timeStart.style.display = "";
//         } else {
//             this.timeEnd.style.display = "none";
//             this.timeStart.style.display = "none";
//         }
//     }
// }
