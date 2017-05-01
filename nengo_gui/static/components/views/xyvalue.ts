import { VNode, dom, h } from "maquette";

import {
    getScale, getTranslate, setScale, setTranslate
} from "../../views/views";

import { PlotView, ResizableComponentView } from "./base";
import * as utils from "../../utils";

export class XYValueView extends PlotView {
    circle: SVGCircleElement;
    path: SVGPathElement;

    constructor(label: string) {
        super(label, 1); // Dimensions always 1
        const pathNode = h("path.line", {stroke: this.colors[0]});
        const circleNode = h("circle.last-point", {
            cx: "0", cy: "0", fill: this.colors[0], r: "0",
        });
        this.path = utils.domCreateSVG(pathNode) as SVGPathElement;
        this.body.appendChild(this.path);
        this.circle = utils.domCreateSVG(circleNode) as SVGCircleElement;
    }

    set line(val: string) {
        this.path.setAttribute("d", val);
        if (!this.body.contains(this.circle)) {
            this.body.appendChild(this.circle);
        }
        // Parse the "d" attribute to get the last x, y coordinate
        const commands = val.split(/(?=[LMC])/);
        const last = commands[commands.length - 1];
        const lastNums = last.replace(/[lmcz]/ig, "").split(",").map(Number);
        this.circle.setAttribute("cx", `${lastNums[0]}`);
        this.circle.setAttribute("cy", `${lastNums[1]}`);
    }

    get scale(): [number, number] {
        return this.overlayScale;
    }

    set scale(val: [number, number]) {
        const width = Math.max(ResizableComponentView.minWidth, val[0]);
        const height = Math.max(ResizableComponentView.minHeight, val[1]);
        this.overlayScale = [width, height];
        this.legend.pos = [width + 2, 0];
        this.circle.setAttribute("r", `${Math.min(width, height) / 30}`);
    }
}
