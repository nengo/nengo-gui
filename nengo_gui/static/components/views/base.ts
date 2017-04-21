import { VNode, dom, h } from "maquette";

import {
    getScale, getTranslate, setScale, setTranslate
} from "../../views/views";

import "./base.css";
import * as utils from "../../utils";

// export class ComponentView {
//     label: HTMLDivElement;
//     root: HTMLDivElement;

//     constructor(label: string, width: string) {
//         // TODO: change to div.component
//         // TODO: escape/unescape functions text? maybe maquette does this?
//         // TODO: put styles in CSS?
//         const node = h("div.graph", {styles: {position: "absolute"}}, [
//             h("div.label.unselectable", {styles: {
//                 position: "fixed",
//                 height: "2em",
//                 width: width,
//             }}, [
//                 label.replace("<", "&lt;").replace(">", "&gt;"),
//             ])
//         ]);
//     }

//     get height(): number {
//         return this.root.offsetHeight;
//     }

//     set height(val: number) {
//         this.root.style.height = `${val}px`;
//     }

//     get width(): number {
//         return this.root.offsetWidth;
//     }

//     set width(val: number) {
//         this.root.style.width = `${val}px`;
//     }
// }

export abstract class ComponentView {
    static labelPad: number = 3;

    baseHeight: number;
    baseWidth: number;
    body: SVGGElement;
    overlay: SVGRectElement;
    root: SVGGElement;

    protected _label: SVGTextElement;
    protected _width: number;

    constructor(label: string) {
        const node = h("g", {transform: "translate(0,0)"}, [
            h("text", {transform: "translate(0,0)"}, [label]),
            h("rect.overlay"),
        ]);

        // Create the SVG group to hold this item's shape and it's label
        this.root = utils.domCreateSVG(node) as SVGGElement;
        this.overlay = this.root.querySelector(".overlay") as SVGRectElement;
        this._label = this.root.querySelector("text") as SVGTextElement;
    }

    get height(): number {
        return this.baseHeight;
    }

    get label(): string {
        return this._label.textContent;
    }

    set label(val: string) {
        this._label.textContent = val;
    }

    get labelVisible(): boolean {
        return this._label.style.display === "";
    }

    set labelVisible(val: boolean) {
        if (val) {
            this._label.style.display = "";
        } else {
            this._label.style.display = "none";
        }
    }

    get left(): number {
        return this.pos[0];
    }

    get overlayScale(): [number, number] {
        return [
            Number(this.overlay.getAttribute("width")),
            Number(this.overlay.getAttribute("height")),
        ];
    }

    set overlayScale(val: [number, number]) {
        const [width, height] = val;
        this.overlay.setAttribute("width", `${width}`);
        this.overlay.setAttribute("height", `${height}`);
        setTranslate(this._label, width * 0.5, height + ComponentView.labelPad);
    }

    get pos(): [number, number] {
        return getTranslate(this.root)
    }

    set pos(val: [number, number]) {
        setTranslate(this.root, val[0], val[1]);
    }

    get top(): number {
        return this.pos[1];
    }

    get width(): number {
        return this.baseWidth;
    }

    ondomadd() {
        const rect = this.body.getBoundingClientRect();
        this.baseHeight = rect.height;
        this.baseWidth = rect.width;
        this.overlayScale = [this.baseWidth, this.baseHeight];
        // Ensure that overlay is on top
        this.root.appendChild(this.overlay);
    }
}

export abstract class ResizableComponentView extends ComponentView {
    static minHeight: number = 20;
    static minWidth: number = 20;

    get height(): number {
        return this.scale[1];
    }

    get width(): number {
        return this.scale[0];
    }

    abstract get scale(): [number, number];
    abstract set scale(val: [number, number]);
}
