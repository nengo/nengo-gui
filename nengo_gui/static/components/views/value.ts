import { VNode, dom, h } from "maquette";

import {
    getScale, getTranslate, setScale, setTranslate
} from "../../views/views";

import { PlotView } from "./base";
import * as utils from "../../utils";

export class ValueView extends PlotView {
    paths: Array<SVGPathElement>;

    constructor(label: string, dimensions: number = 1) {
        super(label, dimensions);
        const nodes = utils.emptyArray(dimensions).map(
            (_, i) => (h("path.line", {stroke: this.colors[i]}))
        );
        this.paths = nodes.map(
            node => utils.domCreateSVG(node) as SVGPathElement
        );
        this.paths.forEach((path) => {
            this.body.appendChild(path);
        });
    }

    set lines(val: Array<string>) {
        this.paths.forEach((path, i) => {
            path.setAttribute("d", val[i]);
        });
    }
}
