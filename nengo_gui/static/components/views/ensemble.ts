import { VNode, dom, h } from "maquette";

import {
    getScale, getTranslate, setScale, setTranslate
} from "../../views/views";

import { ResizableComponentView } from "./base";
import "./ensemble.css";
import * as utils from "../../utils";

export class EnsembleView extends ResizableComponentView {
    aspect: number = 1.;
    circles: Array<SVGCircleElement>;

    constructor(label: string) {
        super(label);
        const r = "4.843";
        const node = h("g.ensemble", {transform: "scale(1,1)"}, [
            h("circle", {cx: r, cy: "10.52", r: r, "stroke-width": "1"}),
            h("circle", {cx: "16.186", cy: "17.874", r: r, "stroke-width": "1"}),
            h("circle", {cx: "21.012", cy: "30.561", r: r, "stroke-width": "1"}),
            h("circle", {cx: "29.704", cy: "17.23", r: r, "stroke-width": "1"}),
            h("circle", {cx: "5.647", cy: "26.414", r: r, "stroke-width": "1"}),
            h("circle", {cx: "19.894", cy: r, r: r, "stroke-width": "1"}),
        ]);
        this.body = utils.domCreateSVG(node) as SVGGElement;
        this.root.appendChild(this.body);

        // Convert NodeList to array
        this.circles = utils.toArray(this.body.childNodes);
    }

    get scale(): [number, number] {
        const [width, height] = getScale(this.body)
        return [width * this.baseWidth, height * this.baseHeight];
    }

    set scale(val: [number, number]) {
        const width = Math.max(ResizableComponentView.minWidth, val[0]);
        const height = Math.max(ResizableComponentView.minHeight, val[1]);
        // Should be 1 at basewidth; scale accordingly
        const strokeWidth = `${this.baseWidth / width}`;
        setScale(this.body, width / this.baseWidth, height / this.baseHeight);
        this.circles.forEach(circle => {
            circle.setAttribute("stroke-width", strokeWidth);
        });
        this.overlayScale = [width, height];
    }
}
