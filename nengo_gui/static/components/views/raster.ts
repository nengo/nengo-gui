import { VNode, dom, h } from "maquette";

import {
    getScale, getTranslate, setScale, setTranslate
} from "../../views/views";

import { PlotView } from "./base";
import * as utils from "../../utils";

export class RasterView extends PlotView {
    // All the lines are implemented as a single path element
    path: SVGPathElement;

    constructor(label: string) {
        super(label, 1);
        const node = h("path.line", {stroke: this.colors[0]});
        this.path = utils.domCreateSVG(node) as SVGPathElement;
        this.body.appendChild(this.path);
    }

    set line(val: string) {
        this.path.setAttribute("d", val);
    }
}
