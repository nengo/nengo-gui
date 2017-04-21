import { VNode, dom, h } from "maquette";

import * as utils from "../../utils";
import {
    getScale, getTranslate, setScale, setTranslate
} from "../../views/views";

export class Crosshair {
    static xTextOffset = [-2, 17];
    static yTextOffset = [-3, 3];

    x: SVGGElement;
    xLine: SVGLineElement;
    xText: SVGTextElement;
    y: SVGGElement;
    yLine: SVGLineElement;
    yText: SVGTextElement;

    constructor() {
        const crosshair = (xy: string) =>
            h("g.crosshair.crosshair${xy}", {styles: {display: "none"}}, [
                h("line", {x1: "0", x2: "0", y1: "0", y2: "0"}),
                h("text", {x: "0", y: "0"}, ["0.000"]),
            ]);
        this.x = utils.domCreateSVG(crosshair("X")) as SVGGElement;
        this.y = utils.domCreateSVG(crosshair("X")) as SVGGElement;
        this.xLine = this.x.querySelector("line");
        this.xText = this.x.querySelector("text");
        this.yLine = this.y.querySelector("line");
        this.yText = this.y.querySelector("text");
    }

    get pos(): [number, number] {
        return [
            Number(this.xLine.getAttribute("x1")),
            Number(this.yLine.getAttribute("y1")),
        ];
    }

    set pos(val: [number, number]) {
        this.yLine.setAttribute("x2", String(val[0]));
        this.xLine.setAttribute("y1", String(val[1]));
        this.xText.setAttribute("x", String(val[0] + Crosshair.xTextOffset[0]));
        this.yText.setAttribute("y", String(val[1] + Crosshair.yTextOffset[1]));
    }

    get scale(): [number, number] {
        return [
            Number(this.yLine.getAttribute("x2")),
            Number(this.xLine.getAttribute("y1")),
        ];
    }

    set scale(val: [number, number]) {
        this.yLine.setAttribute("x2", String(val[0]));
        this.xLine.setAttribute("y1", String(val[1]));
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

    get xPadding(): number {
        return Number(this.xLine.getAttribute("y2"));
    }

    set xPadding(val: number) {
        this.xLine.setAttribute("y2", String(val));
        this.xText.setAttribute("y", String(val + Crosshair.xTextOffset[1]));
    }

    get yPadding(): number {
        return Number(this.yLine.getAttribute("x1"));
    }

    set yPadding(val: number) {
        this.yLine.setAttribute("x1", String(val));
        this.yText.setAttribute("x", String(val + Crosshair.yTextOffset[0]));
    }
}

export class Axes2DView {
    axisX: SVGGElement;
    axisY: SVGGElement;
    crosshair: Crosshair;
    root: SVGGElement;

    constructor() {
        const node =
            h("g.axes2d", [
                h("g.axis.axisX.unselectable", {transform: "translate(0,0)"}),
                h("g.axis.axisY.unselectable", {transform: "translate(0,0)"}),
            ]);

        this.root = utils.domCreateSVG(node) as SVGGElement;
        this.axisX = this.root.querySelector(".axisX") as SVGGElement;
        this.axisY = this.root.querySelector(".axisY") as SVGGElement;
        this.crosshair = new Crosshair();
        this.root.appendChild(this.crosshair.x);
        this.root.appendChild(this.crosshair.y);
    }

    get fontSize(): number {
        // TODO: make sure this works
        return Number(window.getComputedStyle(this.root).fontSize);
    }

    get scale(): [number, number] {
        return this.crosshair.scale;
    }

    set scale(val: [number, number]) {
        this.crosshair.scale = val;
    }

    get xPadding(): number {
        return getTranslate(this.axisX)[1];
    }

    set xPadding(val: number) {
        setTranslate(this.axisX, 0, val);
        this.crosshair.xLine.setAttribute("y2", String(val));
    }

    get yPadding(): number {
        return getTranslate(this.axisY)[0];
    }

    set yPadding(val: number) {
        setTranslate(this.axisY, val, 0);
        this.crosshair.yPadding = val;
    }

    get yTickWidth(): number {
        return this.axisY.getBBox().width;
    }
}

export class TimeAxesView extends Axes2DView {
    timeEnd: SVGTextElement;
    timeStart: SVGTextElement;

    constructor() {
        super();
        const node = h("text.unselectable", ["0.000"]);
        this.timeEnd = utils.domCreateSVG(node) as SVGTextElement;
        this.timeStart = utils.domCreateSVG(node) as SVGTextElement;
        this.root.appendChild(this.timeEnd);
        this.root.appendChild(this.timeStart);
    }

    get endPos(): [number, number] {
        return [
            Number(this.timeEnd.getAttribute("x")),
            Number(this.timeEnd.getAttribute("y")),
        ]
    }

    set endPos(val: [number, number]) {
        this.timeEnd.setAttribute("x", String(val[0]));
        this.timeEnd.setAttribute("y", String(val[1]));
    }

    get startPos(): [number, number] {
        return [
            Number(this.timeStart.getAttribute("x")),
            Number(this.timeStart.getAttribute("y")),
        ]
    }

    set startPos(val: [number, number]) {
        this.timeStart.setAttribute("x", String(val[0]));
        this.timeStart.setAttribute("y", String(val[1]));
    }

    get timeRange(): [number, number] {
        return [
            Number(this.timeStart.textContent),
            Number(this.timeEnd.textContent),
        ];
    }

    set timeRange(val: [number, number]) {
        const [start, end] = val;
        this.timeStart.textContent = start.toFixed(3);
        this.timeEnd.textContent = end.toFixed(3);
    }

    get timeVisible(): boolean {
        return this.timeEnd.style.display === "";
    }

    set timeVisible(val: boolean) {
        if (val) {
            this.timeEnd.style.display = "";
            this.timeStart.style.display = "";
        } else {
            this.timeEnd.style.display = "none";
            this.timeStart.style.display = "none";
        }
    }
}
