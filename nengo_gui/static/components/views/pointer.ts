import { VNode, dom, h } from "maquette";

import {
    getScale, getTranslate, setScale, setTranslate
} from "../../views/views";

import { ResizableComponentView } from "./base";
import * as utils from "../../utils";

export class PointerView extends ResizableComponentView {

    root: SVGGElement;

    private _items: Array<SVGGElement> = [];
    private _values: Array<number>;

    constructor(label:string, numItems: number) {
        super(label);
        const node = h("g.widget");
        this.root = utils.domCreateSVG(node) as SVGGElement;
        this.numItems = numItems;
    }

    get labels(): Array<string> {
        return this._items.map(item => item.textContent);
    }

    set labels(val: Array<string>) {
        console.assert(val.length === this.numItems);
        this._items.forEach((item, i) => {
            item.textContent = val[i];
        });
    }

    get numItems(): number {
        return this._items.length;
    }

    set numItems(val: number) {
        while (this._items.length - val < 0) {
            this.addItem();
        }
        while (this._items.length - val > 0) {
            this.removeItem();
        }
    }

    get scale(): [number, number] {
        return this.overlayScale;
    }

    set scale(val: [number, number]) {
        const width = Math.max(ResizableComponentView.minWidth, val[0]);
        const height = Math.max(ResizableComponentView.minHeight, val[1]);
        this.overlayScale = [width, height];
    }

    get values(): Array<number> {
        return this._values;
    }

    set values(val: Array<number>) {
        console.assert(val.length === this.numItems);
        const height = this.scale[1];
        const total = val.reduce((a, b) => a + b, 0);

        let y = 0;
        this._items.forEach((item, i) => {
            item.setAttribute("y", `${y}`);

            const hex = utils.clip(val[i] * 255, 0, 255);
            item.setAttribute("stroke", `rgb(${hex},${hex},${hex})`);

            const itemHeight = (val[i] / total) * height;
            item.setAttribute("font-size", `${itemHeight}`);
            y += itemHeight;
        });

        // Keep these around so we resize
        this._values = val;
    }

    private addItem() {
        const width = this.scale[0];
        const i = this._items.length;
        const node = h("text.pointer", {
            "font-size": "12",
            "stroke": "rgb(255, 255, 255)",
            "x": `${width * 0.5}`,
            "y": `${i * 12}`,
        });
        const item = utils.domCreateSVG(node) as SVGGElement;
        this.root.appendChild(item);
        this._items.push(item);
    }

    private removeItem() {
        const item = this._items.pop();
        if (item != null) {
            this.root.removeChild(item);
        }
    }
}
