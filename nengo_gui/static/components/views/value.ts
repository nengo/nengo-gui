import { VNode, dom, h } from "maquette";

import {
    getScale, getTranslate, setScale, setTranslate
} from "../../views/views";

import { TimeAxesView } from "./axes";
import { ResizableComponentView } from "./base";
import "./ensemble.css";
import * as utils from "../../utils";

export class ValueView extends ResizableComponentView {
    axes: TimeAxesView;
    colors: Array<string>;
    line: SVGLineElement;
    paths: Array<SVGPathElement>;
    plot: SVGGElement;

    constructor(label: string, dimensions: number = 1) {
        super(label);
        this.colors = utils.makeColors(dimensions);
        this.axes = new TimeAxesView();
        this.body = this.axes.root;
        const paths = new Array(dimensions);

        const node = h("g.value", new Array(dimensions).map(
            (_, i) => (h("path.line", {stroke: this.colors[i]}))
        ));
        this.plot = utils.domCreateSVG(node) as SVGGElement;
        this.body.appendChild(this.plot);
        this.root.appendChild(this.body);
        this.paths = Array.prototype.slice.call(
            this.plot.childNodes
        ) as Array<SVGPathElement>;
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
        // this.circles.forEach(circle => {
        //     circle.setAttribute("stroke-width", strokeWidth);
        // });
        this.overlayScale = [width, height];
    }

}
