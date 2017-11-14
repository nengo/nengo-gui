import { VNode, dom, h } from "maquette";

import "./network.css";

import { Component, ResizableComponent, ResizableComponentView } from "./component";
import { config } from "../config";
import {
    ComponentConnection,
    FeedforwardConnection,
    RecurrentConnection
} from "./connection";
import { Menu } from "../menu";
import { NetGraph } from "../netgraph/main";
import { Plot } from "./plot";
import { Position } from "./position";
import { Connection } from "../server";
import * as utils from "../utils";
import { registerComponent } from "./registry";

export class Network extends ResizableComponent {
    expanded: boolean;
    // spTargets; // Vocab...? Subclass for SPA networks?
    // defaultOutput;
    gClass: string[];
    gNetworks: SVGElement;

    protected _depth: number;
    protected _view: NetworkView;

    constructor({
        server,
        uid,
        pos,
        dimensions,
        expanded = false,
        depth = 0,
        defaultOutput = null
    }: {
        server: Connection;
        uid: string;
        pos: Position;
        dimensions: number;
        expanded?: boolean;
        depth?: number;
        defaultOutput?: string;
    }) {
        super(server, uid, pos.left, pos.top, pos.width, pos.height, dimensions);

        this.expanded = expanded;
        this.depth = depth;
        // this.defaultOutput = defaultOutput;
        this.transparent = config.transparentNets;

        // Do in expanded or depth setter?
        // this.computeFill();

        document.addEventListener("nengoConfigChange", (event: CustomEvent) => {
            const key = event.detail;
            if (key === "transparentNets") {
                this.transparent = config.transparentNets;
            }
        });
    }

    get depth(): number {
        return this._depth;
    }

    set depth(val: number) {
        const fill = Math.round(255 * Math.pow(0.8, val));
        const stroke = Math.round(255 * Math.pow(0.8, val + 2));
        this.view.fill = `rgb(${fill},${fill},${fill})`;
        this.view.stroke = `rgb(${stroke},${stroke},${stroke})`;
        this._depth = val;
    }

    get transparent(): boolean {
        return this.view.transparent;
    }

    set transparent(val: boolean) {
        this.view.transparent = val;
    }

    get view(): NetworkView {
        if (this._view === null) {
            this._view = new NetworkView("?");
        }
        return this._view;
    }

    addMenuItems() {
        // this.menu.addAction("Output Value", () => {
        //     this.createGraph("Value");
        // }, () => this.defaultOutput && this.spTargets.length === 0);
        // this.menu.addAction("Semantic pointer cloud", () => {
        //     this.createGraph("Pointer", this.spTargets[0]);
        // }, () => this.spTargets.length > 0);
        // this.menu.addAction("Semantic pointer plot", () => {
        //     this.createGraph("SpaSimilarity", this.spTargets[0]);
        // }, () => this.spTargets.length > 0);
        this.menu.addAction("Details ...", () => {
            // TODO
            // this.createModal();
        });
    }

    /**
     * Determine the fill color based on the depth.
     */
    computeFill() {
        // const depth = this.ng.transparentNets ? 1 : this.view.depth;
        // TODO: depth
        const depth = 1;
    }

    onnetgraphadd(netgraph: NetGraph) {
        this.menu.addAction(
            "Collapse network",
            () => {
                netgraph.collapse(this);
            },
            () => this.expanded
        );
        this.menu.addAction(
            "Auto-layout",
            () => {
                // TODO: server?
                this.server.send("netgraph.autolayout");
            },
            () => this.expanded
        );
        this.menu.addAction(
            "Expand network",
            () => {
                netgraph.expand(this);
            },
            () => !this.expanded
        );

        this.interactRoot.on("doubletap", event => {
            // Get rid of menus when clicking off
            if (event.button === 0) {
                if (Menu.shown !== null) {
                    Menu.hideShown();
                } else {
                    if (this.expanded) {
                        netgraph.collapse(this);
                    } else {
                        netgraph.expand(this);
                    }
                }
            }
        });

        super.onnetgraphadd(netgraph);
    }
}

export class NetworkView extends ResizableComponentView {
    rect: SVGRectElement;

    constructor(label: string) {
        super(label);
        const node = h("g.network", [
            h("rect", {
                height: "50",
                styles: {
                    "fill": "rgb(0,0,0)",
                    "fill-opacity": "1.0",
                    "stroke": "rgb(0,0,0)",
                },
                width: "50",
                x: "0",
                y: "0",
            })
        ]);
        this.body = utils.domCreateSVG(node) as SVGGElement;
        this.root.appendChild(this.body);
        this.rect = this.body.firstChild as SVGRectElement;
    }

    get fill(): string {
        return this.rect.style.fill;
    }

    set fill(val: string) {
        this.rect.style.fill = val;
    }

    get scale(): [number, number] {
        return [
            Number(this.rect.getAttribute("width")),
            Number(this.rect.getAttribute("height")),
        ];
    }

    set scale(val: [number, number]) {
        const width = Math.max(ResizableComponentView.minWidth, val[0]);
        const height = Math.max(ResizableComponentView.minHeight, val[1]);
        this.rect.setAttribute("width", `${width}`);
        this.rect.setAttribute("height", `${height}`);
        this.overlayScale = [width, height];
    }

    get stroke(): string {
        return this.rect.style.stroke;
    }

    set stroke(val: string) {
        this.rect.style.stroke = val;
    }

    get transparent(): boolean {
        return this.rect.style.fillOpacity === "0";
    }

    set transparent(val: boolean) {
        if (val) {
            this.rect.style.fillOpacity = "0";
        } else {
            this.rect.style.fillOpacity = "1";
        }
    }
}

registerComponent("network", Network);
