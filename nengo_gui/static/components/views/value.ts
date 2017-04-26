import { VNode, dom, h } from "maquette";

import {
    getScale, getTranslate, setScale, setTranslate
} from "../../views/views";

import { AxesView } from "./axes";
import { ResizableComponentView } from "./base";
// import "./value.css";
import * as utils from "../../utils";

export class ValueView extends ResizableComponentView {
    axes: AxesView;
    colors: Array<string>;
    line: SVGLineElement;
    paths: Array<SVGPathElement>;
    plot: SVGGElement;

    constructor(label: string, dimensions: number = 1) {
        super(label);
        this.colors = utils.makeColors(dimensions);
        this.axes = new AxesView();
        this.body = this.axes.root;
        const paths = new Array(dimensions);

        const node =
            h("g.plot.value", Array.apply(null, Array(dimensions)).map(
                (_, i) => (h("path.line", {stroke: this.colors[i]}))
            ));
        this.plot = utils.domCreateSVG(node) as SVGGElement;
        this.body.appendChild(this.plot);
        this.root.appendChild(this.body);
        this.paths = Array.prototype.slice.call(
            this.plot.childNodes
        ) as Array<SVGPathElement>;
    }

    set lines(val: Array<string>) {
        this.paths.forEach((path, i) => {
            path.setAttribute("d", val[i]);
        });
    }

    get scale(): [number, number] {
        return this.overlayScale;
    }

    set scale(val: [number, number]) {
        const width = Math.max(ResizableComponentView.minWidth, val[0]);
        const height = Math.max(ResizableComponentView.minHeight, val[1]);
        this.overlayScale = [width, height];
    }

}
