import * as interact from "interact.js";
import { VNode, dom, h } from "maquette";

import "./ensemble.css";

import { Component, ComponentView } from "./component";
import { Position } from "./position";
import { registerComponent } from "./registry";
import { Connection } from "../server";
import * as utils from "../utils";

export class Ensemble extends Component {
    dimensions: number;
    view: EnsembleView;

    constructor({
        server,
        uid,
        label,
        pos,
        dimensions,
        labelVisible = true
    }: {
        server: Connection;
        uid: string;
        label: string;
        pos: Position;
        dimensions: number;
        labelVisible?: boolean;
    }) {
        super(server, uid, new EnsembleView(), label, pos, labelVisible);
        this.dimensions = dimensions;
    }

    get resizeOptions(): any {
        const options: any = {};
        for (const option in Component.resizeDefaults) {
            options[option] = Component.resizeDefaults[option];
        }
        options.invert = "reposition";
        options.square = true;
        return options;
    }

    addMenuItems() {
        this.menu.addAction("Value", () => {
            this.createGraph("Value");
        });
        this.menu.addAction(
            "XY-value",
            () => {
                this.createGraph("XYValue");
            },
            () => this.dimensions > 1
        );
        this.menu.addAction("Spikes", () => {
            this.createGraph("Raster");
        });
        this.menu.addAction("Voltages", () => {
            this.createGraph("Voltage");
        });
        this.menu.addAction("Firing pattern", () => {
            this.createGraph("SpikeGrid");
        });
        this.menu.addAction("Details ...", () => {
            // TODO
            // this.createModal();
        });
    }
}

export class EnsembleView extends ComponentView {
    circles: Array<SVGCircleElement>;

    // Width and height when g.ensemble transform is scale(1,1)
    static baseWidth = 34.55;
    static baseHeight = 35.4;
    static heightToWidth = EnsembleView.baseHeight / EnsembleView.baseWidth;

    constructor() {
        super();
        const r = "4.843";
        const node = h("g.ensemble", { transform: "scale(1,1)" }, [
            h("circle", { cx: r, cy: "10.52", r: r, "stroke-width": "1" }),
            h("circle", {
                cx: "16.186",
                cy: "17.874",
                r: r,
                "stroke-width": "1"
            }),
            h("circle", {
                cx: "21.012",
                cy: "30.561",
                r: r,
                "stroke-width": "1"
            }),
            h("circle", {
                cx: "29.704",
                cy: "17.23",
                r: r,
                "stroke-width": "1"
            }),
            h("circle", {
                cx: "5.647",
                cy: "26.414",
                r: r,
                "stroke-width": "1"
            }),
            h("circle", { cx: "19.894", cy: r, r: r, "stroke-width": "1" })
        ]);
        this.body = utils.domCreateSVG(node) as SVGGElement;
        this.root.appendChild(this.body);

        // Convert NodeList to array
        this.circles = utils.toArray(this.body.childNodes);
    }

    get scale(): [number, number] {
        return this.overlayScale;
    }

    set scale(val: [number, number]) {
        // Ensembles should keep the same aspect ratio; if we get something else,
        // we'll use the larger of the width and height as height, and scale
        // the width appropriately.
        const height = val[1];
        const width = EnsembleView.heightToWidth * height;
        const strokeWidth = `${EnsembleView.baseWidth / width}`;
        utils.setScale(this.body, height / EnsembleView.baseHeight);
        this.circles.forEach(circle => {
            circle.setAttribute("stroke-width", strokeWidth);
        });
        this.overlayScale = [width, height];
    }
}

registerComponent("ensemble", Ensemble);
