import { VNode, dom, h } from "maquette";

import {
    getScale, getTranslate, setScale, setTranslate
} from "../../views/views";

import * as utils from "../../utils"

import "./connection.css";

function arrowhead(rotate: number = 0): VNode {
    return h("path.arrow", {
        d: "M 10,0 L -5,-5 -5,5 z",
        transform: `translate(0,0) rotate(${rotate})`,
    });
}


export class ConnectionView {
    static arrowLocation = 0.6;

    arrow: SVGPathElement;
    line: SVGLineElement;
    root: SVGGElement;

    constructor() {
        const node = h("g.connection", [
            h("line", {x1: "0", x2: "10", y1: "0", y2: "10"}),
            arrowhead(),
        ]);
        this.root = utils.domCreateSVG(node) as SVGGElement;
        this.arrow = this.root.querySelector("path.arrow") as SVGPathElement;
        this.line = this.root.querySelector("line") as SVGLineElement;
    }

    get endPos(): [number, number] {
        return [
            Number(this.line.getAttribute("x2")),
            Number(this.line.getAttribute("y2")),
        ]
    }

    set endPos(val: [number, number]) {
        this.line.setAttribute("x2", `${val[0]}`);
        this.line.setAttribute("y2", `${val[1]}`);
        this.syncArrowWithLine();
    }

    get startPos(): [number, number] {
        return [
            Number(this.line.getAttribute("x1")),
            Number(this.line.getAttribute("y1")),
        ]
    }

    set startPos(val: [number, number]) {
        this.line.setAttribute("x1", `${val[0]}`);
        this.line.setAttribute("y1", `${val[1]}`);
        this.syncArrowWithLine();
    }

    get visible(): boolean {
        return this.root.style.display !== "none";
    }

    set visible(val: boolean) {
        if (val) {
            this.root.style.display = null;
        } else {
            this.root.style.display = "none";
        }
    }

    private syncArrowWithLine() {
        const start = this.startPos;
        const end = this.endPos;
        setTranslate(
            this.arrow,
            utils.lerp(start[0], end[0], ConnectionView.arrowLocation),
            utils.lerp(start[1], end[1], ConnectionView.arrowLocation),
        );
        // TODO: would be nice to do this in one step, but ok for now
        const angle = utils.angle(start[0], end[0], start[1], end[1]);
        const transform = this.arrow.getAttribute("transform");
        this.arrow.setAttribute("transform", `${transform} rotate(${angle})`);
    }
}

export class RecurrentConnectionView {
    static arrowRotation = 171; // In degrees

    arrow: SVGGElement;
    path: SVGGElement;
    root: SVGGElement;

    private _width: number = 1.0;

    constructor() {
        const node =
            h("g.connection.recurrent", {
                transform: "translate(0,0)",
            }, [
                h("path", {d: ""}),
                arrowhead(RecurrentConnectionView.arrowRotation),
            ]);

        this.root = utils.domCreateSVG(node) as SVGGElement;
        this.path = this.root.firstChild as SVGGElement;
        this.arrow = this.root.querySelector("path.arrow") as SVGPathElement;
    }

    get pos(): [number, number] {
        return getTranslate(this.root);
    }

    set pos(val: [number, number]) {
        const [w, h] = [this.width, this.height];
        const r = RecurrentConnectionView.arrowRotation;
        setTranslate(this.root, val[0] + w * 0.15, val[1] - h * 1.1);
        this.arrow.setAttribute("transform", utils.singleline`
            translate(${-w * 0.13},${h * .1165})
            rotate(${r - Math.max(30 - h, 0) * 0.8})
        `);
    }

    get height(): number {
        // Note: aspect ratio is 1 : 0.675
        return this._width * 0.675
    }

    get width(): number {
        return this._width;
    }

    set width(val: number) {
        const w = val;
        // x goes into the negative because we set the position to be
        // the center of the object
        const d = utils.singleline`
            M${w * -.3663},${w * .59656}
            C${w * -.4493},${w * .5397}
            ${w * -.5},${w * .4645}
            ${w * -.5},${w * .3819}
            ${w * -.5},${w * .2083}
            ${w * -.27615},${w * .0676}
            0,${w * .0676}
            S${w * .5},${w * .2083}
            ${w * .5},${w * .3819}
            C${w * .5},${w * .5156}
            ${w * 0.367},${w * .63}
            ${w * 0.18},${w * .675}
        `;
        this.path.setAttribute("d", d);
        this._width = val;
    }

    get visible(): boolean {
        return this.root.style.display !== "none";
    }

    set visible(val: boolean) {
        if (val) {
            this.root.style.display = null;
        } else {
            this.root.style.display = "none";
        }
    }
}
