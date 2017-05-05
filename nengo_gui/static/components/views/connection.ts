import { VNode, dom, h } from "maquette";

import {
    getScale, getTranslate, setScale, setTranslate
} from "../../views/views";

import * as utils from "../../utils"

import "./connection.css";

export class ConnectionView {
    static arrowLocation = 0.6;

    arrow: SVGPathElement;
    line: SVGLineElement;
    root: SVGGElement;

    constructor() {
        const node = h("g.connection", [
            h("line", {x1: "0", x2: "10", y1: "0", y2: "10"}),
            h("path.arrow", {
                d: "M 10,0 L -5,-5 -5,5 z",
                transform: "translate(0,0) rotate(0)",
            }),
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

    arrow: SVGGElement;
    path: SVGGElement;
    root: SVGGElement;

    private _width: number = 1.0;

    constructor() {
        const node =
            h("g.connection.recurrent", {
                transform: "translate(0,0)",
            }, [
                h("path", {d: "M0,0"}),
                h("path.arrow", {
                    d: "M6.5,0 L0,5.0 7.5,8.0 z",
                    transform: "translate(0,0)",
                }),
            ]);

        this.root = utils.domCreateSVG(node) as SVGGElement;
        this.path = this.root.firstChild as SVGGElement;
        this.arrow = this.root.querySelector("path.arrow") as SVGPathElement;
    }

    get pos(): [number, number] {
        return getTranslate(this.root);
    }

    set pos(val: [number, number]) {
        setTranslate(this.root, val[0], val[1]);

        // const height = item.getDisplayedSize()[1];

        // const scale = item.shape.getAttribute("transform");
        // const scaleValue = parseFloat(scale.split(/[()]+/)[1]);

        // if (this.minimap === false) {
        //     this.recurrentEllipse.setAttribute(
        //         "stroke-width", 2 / scaleValue);
        // } else {
        //     this.recurrentEllipse.setAttribute(
        //         "stroke-width", 1 / scaleValue);
        // }

        // const ex = prePos[0] - scaleValue * 17.5;
        // const ey = prePos[1] - height - scaleValue * 36;

        // this.recurrentEllipse.setAttribute(
        //     "transform", "translate(" + ex + "," + ey + ")" + scale);

        // const mx = prePos[0] - 1;
        // let my;
        // if (this.minimap === false) {
        //     my = prePos[1] - height - scaleValue * 32.15 - 5;
        // } else {
        //     my = prePos[1] - height - scaleValue * 32 - 2;
        // }
        // this.marker.setAttribute(
        //     "transform", "translate(" + mx + "," + my + ")");
    }

    get width(): number {
        return this._width;
    }

    set width(val: number) {
        // Note: aspect ratio is 10 : 6.75
        const w = val;
        const d = utils.singleline`
            M${w * .1337},${w * .59656}
            C${w * .0507},${w * .5397} 0,${w * .4645} 0,${w * .3819}
            C0,${w * .2083} ${w * .22385},${w * .0676} ${w * 0.5},${w * .0676}
            S${w},${w * .2083} ${w},${w * .3819}
            C${w},${w * .5156} ${w * 0.867},${w * .63} ${w * 0.68},${w * .675}
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
