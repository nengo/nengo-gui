import { VNode, dom, h } from "maquette";

import {
    getScale, getTranslate, setScale, setTranslate
} from "../../views/views";

import * as utils from "../../utils";

export class ComponentView {
    label: HTMLDivElement;
    root: HTMLDivElement;

    constructor(label: string, width: string) {
        // TODO: change to div.component
        // TODO: escape/unescape functions text? maybe maquette does this?
        // TODO: put styles in CSS?
        const node = h("div.graph", {styles: {position: "absolute"}}, [
            h("div.label.unselectable", {styles: {
                position: "fixed",
                height: "2em",
                width: width,
            }}, [
                label.replace("<", "&lt;").replace(">", "&gt;"),
            ])
        ]);
    }

    get height(): number {
        return this.root.offsetHeight;
    }

    set height(val: number) {
        this.root.style.height = `${val}px`;
    }

    get labelVisible(): boolean {
        return this.label.style.display === "inline";
    }

    set labelVisible(val: boolean) {
        if (val) {
            this.label.style.display = "inline";
        } else {
            this.label.style.display = "none";
        }
    }

    get width(): number {
        return this.root.offsetWidth;
    }

    set width(val: number) {
        this.root.style.width = `${val}px`;
    }
}

export abstract class ModelObjView {
    static minHeight: number = 20;
    static minWidth: number = 20;

    baseHeight: number;
    baseWidth: number;
    overlay: SVGRectElement;
    root: SVGGElement;
    shape: SVGGElement;

    protected _label: SVGTextElement;
    protected _width: number;

    constructor(label: string) {
        const node = h("g", {transform: "translate(0,0)"}, [
            this.shapeNode(),
            h("text", {transform: "translate(0,0)"}, [label]),
            h("rect.overlay", {fill: "transparent", x: "0", y: "0"}),
        ]);

        // Create the SVG group to hold this item's shape and it's label
        this.root = utils.domCreateSVG(node) as SVGGElement;
        this.shape = this.root.firstChild as SVGGElement;
        this._label = this.root.querySelector("text") as SVGTextElement;
        this.overlay = this.root.querySelector(".overlay") as SVGRectElement;
    }

    get height(): number {
        return this.scale[1];
    }

    get label(): string {
        return this._label.textContent;
    }

    set label(val: string) {
        this._label.textContent = val;
    }

    get left(): number {
        return this.pos[0];
    }

    get pos(): [number, number] {
        return getTranslate(this.root)
    }

    set pos(val: [number, number]) {
        setTranslate(this.root, val[0], val[1]);
    }

    get scale(): [number, number] {
        const [width, height] = getScale(this.shape)
        return [width * this.baseWidth, height * this.baseHeight];
    }

    set scale(val: [number, number]) {
        const width = Math.max(ModelObjView.minWidth, val[0]);
        const height = Math.max(ModelObjView.minHeight, val[1]);
        setScale(this.shape, width / this.baseWidth, height / this.baseHeight);
        setTranslate(this._label, width * 0.5, height);
        this.overlay.setAttribute("width", `${width}`);
        this.overlay.setAttribute("height", `${height}`);
    }

    get top(): number {
        return this.pos[1];
    }

    get width(): number {
        return this.scale[0];
    }

    ondomadd() {
        const rect = this.shape.getBoundingClientRect();
        this.baseHeight = rect.height;
        this.baseWidth = rect.width;
    }

    abstract shapeNode(): VNode;
}
