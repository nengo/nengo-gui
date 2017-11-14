import * as interact from "interact.js";
import { VNode, dom, h } from "maquette";

import "./ensemble.css";

import { ResizableComponent, ResizableComponentView } from "./component";
import { Position } from "./position";
import { registerComponent } from "./registry";
import { Connection } from "../server";
import * as utils from "../utils";

export class Ensemble extends ResizableComponent {
    protected _view: EnsembleView;

    constructor({
        server,
        uid,
        pos,
        dimensions
    }: {
        server: Connection;
        uid: string;
        pos: Position;
        dimensions: number;
    }) {
        super(
            server,
            uid,
            pos.left,
            pos.top,
            pos.width,
            pos.height,
            dimensions
        );
    }

    get resizeOptions(): any {
        const options: any = {};
        for (const option in ResizableComponent.resizeOptions) {
            options[option] = ResizableComponent.resizeOptions[option];
        }
        options.invert = "reposition";
        options.square = true;
        return options;
    }

    get view(): EnsembleView {
        if (this._view === null) {
            this._view = new EnsembleView("?");
        }
        return this._view;
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

export class EnsembleView extends ResizableComponentView {
    aspect: number = 1;
    circles: Array<SVGCircleElement>;

    constructor(label: string) {
        super(label);
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
        const [width, height] = utils.getScale(this.body);
        return [width * this.baseWidth, height * this.baseHeight];
    }

    set scale(val: [number, number]) {
        const width = Math.max(ResizableComponentView.minWidth, val[0]);
        const height = Math.max(ResizableComponentView.minHeight, val[1]);
        // Should be 1 at basewidth; scale accordingly
        const strokeWidth = `${this.baseWidth / width}`;
        utils.setScale(
            this.body,
            width / this.baseWidth,
            height / this.baseHeight
        );
        this.circles.forEach(circle => {
            circle.setAttribute("stroke-width", strokeWidth);
        });
        this.overlayScale = [width, height];
    }
}

registerComponent("ensemble", Ensemble);
