import { VNode, dom, h } from "maquette";

import {
    getScale, getTranslate, setScale, setTranslate
} from "../../views/views";

import { PlotView } from "./base";
import * as utils from "../../utils";

export class ValueView extends PlotView {

    paths: Array<SVGPathElement> = [];

    constructor(label: string, dimensions: number = 1) {
        super(label, dimensions);
        this.numLines = dimensions;
    }

    set lines(val: Array<string>) {
        this.paths.forEach((path, i) => {
            path.setAttribute("d", val[i]);
        });
    }

    get numLines(): number {
        return this.paths.length;
    }

    set numLines(val: number) {
        while (this.paths.length - val < 0) {
            this.addPath();
        }
        while (this.paths.length - val > 0) {
            this.removePath();
        }
    }

    private addPath() {
        const i = this.paths.length;
        const node = h("path.line", {stroke: this.colors[i]});
        const path = utils.domCreateSVG(node) as SVGPathElement;
        this.paths.push(path);
        this.body.appendChild(path);
    }

    private removePath() {
        const path = this.paths.pop();
        if (path != null) {
            this.body.removeChild(path);
        }
    }
}
