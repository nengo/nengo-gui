import { VNode, dom, h } from "maquette";

import "./node.css";

import { Component, ComponentView } from "./component";
import { Position } from "./position";
import { registerComponent } from "./registry";
import { Connection } from "../server";
import * as utils from "../utils";

export class PassthroughNode extends Component {
    fixedHeight: number;
    fixedWidth: number;
    view: PassthroughNodeView;

    constructor({
        server,
        uid,
        label,
        pos,
        labelVisible = true
    }: {
        server: Connection;
        uid: string;
        label: string;
        pos: Position;
        labelVisible?: boolean;
    }) {
        super(server, uid, new PassthroughNodeView(), label, pos, labelVisible);
    }

    get resizeOptions(): any {
        return null;
    }
}

export class PassthroughNodeView extends ComponentView {
    static width: number = 8;
    static height: number = 8;

    constructor() {
        super();
        const node = h("g.passthrough", [
            h("circle", { cx: "4", cy: "4", r: "4" })
        ]);
        this.body = utils.domCreateSVG(node) as SVGGElement;
        this.root.appendChild(this.body);
        this.overlayScale = [
            PassthroughNodeView.width,
            PassthroughNodeView.height
        ];
    }

    get scale(): [number, number] {
        return [PassthroughNodeView.width, PassthroughNodeView.height];
    }

    set scale(val: [number, number]) {
        // Scale cannot be changed
    }
}

export class Node extends Component {
    htmlNode;
    dimensions: number;
    view: NodeView;

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
        super(server, uid, new NodeView(), label, pos, labelVisible);
        this.dimensions = dimensions;
    }

    addMenuItems() {
        this.menu.addAction("Slider", () => {
            this.createGraph("Slider");
        });
        this.menu.addAction(
            "Value",
            () => {
                this.createGraph("Value");
            },
            () => this.dimensions > 0
        );
        this.menu.addAction(
            "XY-value",
            () => {
                this.createGraph("XYValue");
            },
            () => this.dimensions > 1
        );
        this.menu.addAction(
            "HTML",
            () => {
                this.createGraph("HTMLView");
            },
            () => this.htmlNode
        );
        this.menu.addAction("Details ...", () => {
            // TODO
            // this.createModal();
        });
    }
}

export class NodeView extends ComponentView {
    static radiusScale: number = 0.1;

    rect: SVGRectElement;

    constructor() {
        super();
        const node = h("g.node", [
            h("rect", {
                height: "50",
                rx: `${NodeView.radiusScale * 50}`,
                ry: `${NodeView.radiusScale * 50}`,
                width: "50",
                x: "0",
                y: "0"
            })
        ]);
        this.body = utils.domCreateSVG(node) as SVGGElement;
        this.root.appendChild(this.body);
        this.rect = this.body.firstChild as SVGRectElement;
    }

    get scale(): [number, number] {
        return [
            Number(this.rect.getAttribute("width")),
            Number(this.rect.getAttribute("height"))
        ];
    }

    set scale(val: [number, number]) {
        const [width, height] = val;
        const smaller = Math.min(width, height);
        this.rect.setAttribute("width", `${width}`);
        this.rect.setAttribute("height", `${height}`);
        this.rect.setAttribute("rx", `${NodeView.radiusScale * smaller}`);
        this.rect.setAttribute("ry", `${NodeView.radiusScale * smaller}`);
        this.overlayScale = [width, height];
    }
}

registerComponent("node", Node);
