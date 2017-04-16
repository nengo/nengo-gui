import { VNode, dom, h } from "maquette";

import {
    getScale, getTranslate, setScale, setTranslate
} from "../../views/views";

import { ModelObjView, ResizableModelObjView } from "./base";

import * as utils from "../../utils"

import "./node.css";

export class PassthroughNodeView extends ModelObjView {
    // fixedHeight: number = 3;
    // fixedWidth: number = 3;

    shapeNode(): VNode {
        return h("g.passthrough", [
            h("circle", {cx: "4", cy: "4", r: "4"}),
        ]);
    }

    // constructor(label: string) {
    //     super(label);

        // TODO: WTF can this be avoided?
        // I have to make a sepcific minimap subclass for this...
        // or something better?
        // if (this.minimap === false) {
        //     this.fixedWidth = 10;
        //     this.fixedHeight = 10;
        // } else {
        //     this.fixedWidth = 3;
        //     this.fixedHeight = 3;
        // }

    // }

    // _getScreenWidth() {
    //     return this.fixedWidth;
    // }

    // _getScreenHeight() {
    //     return this.fixedHeight;
    // }

    // redrawSize() {
    //     const screenD = super.redrawSize();

    //     this.shape.setAttribute("rx", String(screenD.width / 2));
    //     this.shape.setAttribute("ry", String(screenD.height / 2));

    //     return screenD;
    // }
}

export class NodeView extends ResizableModelObjView {
    static radiusScale: number = 0.1;

    rect: SVGRectElement;

    constructor(label: string) {
        super(label);
        this.rect = this.shape.firstChild as SVGRectElement;
    }

    shapeNode(): VNode {
        return h("g.node", [
            h("rect", {
                height: "50",
                rx: `${NodeView.radiusScale * 50}`,
                ry: `${NodeView.radiusScale * 50}`,
                width: "50",
                x: "0",
                y: "0",
            }),
        ]);
    }

    get scale(): [number, number] {
        return [
            Number(this.rect.getAttribute("width")),
            Number(this.rect.getAttribute("height")),
        ];
    }

    set scale(val: [number, number]) {
        const width = Math.max(ResizableModelObjView.minWidth, val[0]);
        const height = Math.max(ResizableModelObjView.minHeight, val[1]);
        const smaller = Math.min(width, height);
        this.rect.setAttribute("width", `${width}`);
        this.rect.setAttribute("height", `${height}`);
        this.rect.setAttribute("rx", `${NodeView.radiusScale * smaller}`);
        this.rect.setAttribute("ry", `${NodeView.radiusScale * smaller}`);
        this.overlayScale = [width, height];
    }

    // redrawSize() {
    //     const screenD = super.redrawSize();

    //     const radius = Math.min(screenD.width, screenD.height);
    //     this.shape.setAttribute("rx", `${radius * this.radiusScale}`);
    //     this.shape.setAttribute("ry", `${radius * this.radiusScale}`);

    //     return screenD;
    // }
}
