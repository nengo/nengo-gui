import { VNode, dom, h } from "maquette";

import "./connection.css";

import { Component } from "./component";
import * as utils from "../utils";

// Note: connections are not registered in the component registry because
// they're handled differently by the netgraph; see ../netgraph.ts

export abstract class ComponentConnection {
    view: ConnectionView | RecurrentConnectionView;

    get visible(): boolean {
        return this.view.visible;
    }

    set visible(val: boolean) {
        this.view.visible = val;
    }

    abstract syncWithComponents();
}

export class FeedforwardConnection extends ComponentConnection {
    readonly pre: Component;
    readonly post: Component;
    view: ConnectionView;

    constructor(pre, post) {
        super();
        console.assert(this.pre !== this.post);
        this.pre = pre;
        this.post = post;
        this.view = new ConnectionView();
        this.syncWithComponents();

        this.pre.interactRoot.on("dragmove resizemove", () => {
            this.view.startPos = this.pre.view.centerPos;
        });
        this.post.interactRoot.on("dragmove resizemove", () => {
            this.view.endPos = this.post.view.centerPos;
        });
    }

    syncWithComponents() {
        this.view.startPos = this.pre.view.centerPos;
        this.view.endPos = this.post.view.centerPos;
    }

    // constructor(ng, info, minimap, miniConn) {
    // Flag to indicate this Connection has been deleted
    // this.removed = false;

    // The actual NetGraphItem currently connected to/from
    // this.pre = null;
    // this.post = null;

    // this.minimap = minimap;
    // this.miniConn = miniConn;
    // if (!minimap) {
    //     this.gConns = ng.gConns;
    //     this.objects = ng.svgObjects;
    // } else {
    //     this.gConns = ng.gConnsMini;
    //     this.objects = ng.minimapObjects;
    // }

    // The uids for the pre and post items in the connection.

    // The lists start with the ideal target item, followed by the parent
    // of that item, and its parent, and so on.  If the first item on the
    // this does not exist (due to it being inside a collapsed network),
    // the connection will look for the next item on the list, and so on
    // until it finds one that does exist.
    // this.pres = info.pre;
    // this.posts = info.post;

    // this.recurrent = this.pres[0] === this.posts[0];

    // Figure out the best available items to connect to
    // this.setPre(this.findPre());
    // this.setPost(this.findPost());

    // Determine parent and add to parent's children list
    // if (info.parent === null) {
    //     this.parent = null;
    // } else {
    //     this.parent = this.objects[info.parent];
    //     if (!minimap) {
    //         this.parent.childConnections.push(this);
    //     }
    // }

    // Create the line and its arrowhead marker
    // this.g = ng.createSVGElement("g");

    // this.createLine();

    // this.redraw();

    // this.gConns.appendChild(this.g);
    // }
}

export class RecurrentConnection extends ComponentConnection {
    readonly component: Component;
    view: RecurrentConnectionView;

    constructor(component) {
        super();
        this.component = component;
        this.view = new RecurrentConnectionView();
        this.syncWithComponents();

        this.component.interactRoot.on("dragmove resizemove", () =>
            this.syncWithComponents()
        );
    }

    syncWithComponents() {
        this.view.width = this.component.view.scale[0] * 1.4;
        this.view.pos = this.component.view.centerPos;
    }
}

function arrowhead(rotate: number = 0): VNode {
    return h("path.arrow", {
        d: "M 10,0 L -5,-5 -5,5 z",
        transform: `translate(0,0) rotate(${rotate})`
    });
}

export class ConnectionView {
    static arrowLocation = 0.6;

    arrow: SVGPathElement;
    line: SVGLineElement;
    root: SVGGElement;

    constructor() {
        const node = h("g.connection", [
            h("line", { x1: "0", x2: "10", y1: "0", y2: "10" }),
            arrowhead()
        ]);
        this.root = utils.domCreateSVG(node) as SVGGElement;
        this.arrow = this.root.querySelector("path.arrow") as SVGPathElement;
        this.line = this.root.querySelector("line") as SVGLineElement;
    }

    get endPos(): [number, number] {
        return [
            Number(this.line.getAttribute("x2")),
            Number(this.line.getAttribute("y2"))
        ];
    }

    set endPos(val: [number, number]) {
        this.line.setAttribute("x2", `${val[0]}`);
        this.line.setAttribute("y2", `${val[1]}`);
        this.syncArrowWithLine();
    }

    get startPos(): [number, number] {
        return [
            Number(this.line.getAttribute("x1")),
            Number(this.line.getAttribute("y1"))
        ];
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
        utils.setTranslate(
            this.arrow,
            utils.lerp(start[0], end[0], ConnectionView.arrowLocation),
            utils.lerp(start[1], end[1], ConnectionView.arrowLocation)
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
        const node = h(
            "g.connection.recurrent",
            {
                transform: "translate(0,0)"
            },
            [
                h("path", { d: "" }),
                arrowhead(RecurrentConnectionView.arrowRotation)
            ]
        );

        this.root = utils.domCreateSVG(node) as SVGGElement;
        this.path = this.root.firstChild as SVGGElement;
        this.arrow = this.root.querySelector("path.arrow") as SVGPathElement;
    }

    get pos(): [number, number] {
        return utils.getTranslate(this.root);
    }

    set pos(val: [number, number]) {
        const [w, h] = [this.width, this.height];
        const r = RecurrentConnectionView.arrowRotation;
        utils.setTranslate(this.root, val[0] + w * 0.15, val[1] - h * 1.1);
        this.arrow.setAttribute(
            "transform",
            utils.singleline`
            translate(${-w * 0.13},${h * 0.1165})
            rotate(${r - Math.max(30 - h, 0) * 0.8})
        `
        );
    }

    get height(): number {
        // Note: aspect ratio is 1 : 0.675
        return this._width * 0.675;
    }

    get width(): number {
        return this._width;
    }

    set width(val: number) {
        const w = val;
        // x goes into the negative because we set the position to be
        // the center of the object
        const d = utils.singleline`
            M${w * -0.3663},${w * 0.59656}
            C${w * -0.4493},${w * 0.5397}
            ${w * -0.5},${w * 0.4645}
            ${w * -0.5},${w * 0.3819}
            ${w * -0.5},${w * 0.2083}
            ${w * -0.27615},${w * 0.0676}
            0,${w * 0.0676}
            S${w * 0.5},${w * 0.2083}
            ${w * 0.5},${w * 0.3819}
            C${w * 0.5},${w * 0.5156}
            ${w * 0.367},${w * 0.63}
            ${w * 0.18},${w * 0.675}
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
