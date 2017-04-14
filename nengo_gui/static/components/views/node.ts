import { VNode, dom, h } from "maquette";

import { ModelObjView } from "./base";
import * as utils from "../../utils"

export class PassthroughNodeView extends ModelObjView {
    // fixedHeight: number = 3;
    // fixedWidth: number = 3;

    shapeNode(): VNode {
        return h("g.passthrough", {transform: "scale(1,1)"}, [
            h("circle.passthrough", {
                cx: "3",
                cy: "3",
                r: "3",
            })
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

export class NodeView extends ModelObjView {
    radiusScale: number = 0.1;

    shapeNode(): VNode {
        // const screenD = this.displayedShape; // TODO: ???
        // const halfW = screenD.width / 2;
        // const halfH = screenD.height / 2;
        // const radius = Math.min(screenD.width, screenD.height);
        return h("g.node", {transform: "scale(1,1)"}, [
            h("rect.node", {
                height: "50",
                rx: `${this.radiusScale * 50}`,
                ry: `${this.radiusScale * 50}`,
                width: "50",
                x: "0",
                y: "0",
            }),
        ]);
    }

    // redrawSize() {
    //     const screenD = super.redrawSize();

    //     const radius = Math.min(screenD.width, screenD.height);
    //     this.shape.setAttribute("rx", `${radius * this.radiusScale}`);
    //     this.shape.setAttribute("ry", `${radius * this.radiusScale}`);

    //     return screenD;
    // }
}
