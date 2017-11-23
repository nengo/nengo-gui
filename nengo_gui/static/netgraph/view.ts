import { dom, h, VNode } from "maquette";

import "./view.css";

import * as utils from "../utils";

export class NetGraphView {
    conns: SVGGElement;
    items: SVGGElement;
    networks: SVGGElement;
    root: SVGSVGElement;
    widgets: SVGGElement;

    private _offset: [number, number] = [0, 0];

    constructor() {
        // TODO:
        // Reading netgraph.css file as text and embedding it within def tags;
        // this is needed for saving the SVG plot to disk.
        // const css = require("!!css-loader!./netgraph.css").toString();

        // const defs = h("defs", [h(
        //     "style", {type: "text/css"}, [`<![CDATA[\n${css}\n]]>`],
        // )]);

        // Create the master SVG element
        const svg = h("svg.netgraph", [
            h("g.nets"),
            h("g.conns"),
            h("g.items"),
            h("g.widgets")
        ]); // defs,

        this.root = dom.create(svg).domNode as SVGSVGElement;

        // Three separate layers, so that expanded networks are at the back,
        // then connection lines, and then other items (nodes, ensembles, and
        // collapsed networks) are drawn on top.
        this.networks = this.root.querySelector(".nets") as SVGGElement;
        this.conns = this.root.querySelector(".conns") as SVGGElement;
        this.items = this.root.querySelector(".items") as SVGGElement;
        this.widgets = this.root.querySelector(".widgets") as SVGGElement;
    }

    get fontPercent(): number {
        return parseFloat(this.root.style.fontSize);
    }

    set fontPercent(val: number) {
        this.root.style.fontSize = `${val}%`;
    }

    get height(): number {
        return this.root.getBoundingClientRect().height;
    }

    get offset(): [number, number] {
        return this._offset;
    }

    set offset(val: [number, number]) {
        this._offset = val;
        this.updateOffset();
    }

    get width(): number {
        return this.root.getBoundingClientRect().width;
    }

    pan(dleft, dtop) {
        this._offset[0] -= dleft;
        this._offset[1] -= dtop;
        this.updateOffset();
    }

    private updateFontsize() {}

    private updateOffset() {
        this.root.setAttribute(
            "viewBox",
            `${this._offset.join(" ")} ${this.width} ${this.height}`
        );
    }
}
