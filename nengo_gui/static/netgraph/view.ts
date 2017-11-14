import { dom, h, VNode } from "maquette";

import "./netgraph.css";
import * as utils from "../utils";

export class NetGraphView {
    conns: SVGGElement;
    items: SVGGElement;
    networks: SVGGElement;
    root: SVGSVGElement;
    widgets: SVGGElement;

    private _fontSize: number = 16;
    private _offset: [number, number] = [0, 0];
    private _scale: number = 1;
    private _zoomFonts: boolean = false;

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
            h("g.widgets"),
            h("g.nets"),
            h("g.conns"),
            h("g.items")
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

    get fontSize(): number {
        return this._fontSize;
    }

    set fontSize(val: number) {
        this._fontSize = val;
        this.updateFontsize();
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

    get scale(): number {
        return this._scale;
    }

    set scale(val: number) {
        this._scale = val;
        this.updateFontsize();
    }

    get width(): number {
        return this.root.getBoundingClientRect().width;
    }

    get zoomFonts(): boolean {
        return this._zoomFonts;
    }

    set zoomFonts(val: boolean) {
        this._zoomFonts = val;
        this.updateFontsize();
    }

    pan(dleft, dtop) {
        this._offset[0] -= dleft;
        this._offset[1] -= dtop;
        this.updateOffset();
    }

    private updateFontsize() {
        this.root.style.fontSize = this.zoomFonts
            ? `${3 * this.scale * this.fontSize / 100}em`
            : `${this.fontSize / 100}em`;
    }

    private updateOffset() {
        this.root.setAttribute(
            "viewBox",
            `${this._offset.join(" ")} ${this.width} ${this.height}`
        );
    }
}
