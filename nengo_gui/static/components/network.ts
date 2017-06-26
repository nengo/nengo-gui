import { Component, ResizableComponent, Plot } from "./base";
import {
    ComponentConnection, FeedforwardConnection, RecurrentConnection
} from "./connection";
import { Menu } from "../menu";
import { NetGraph } from "../netgraph";
import * as utils from "../utils";
import { NetworkView } from "./views/network";

export class Network extends ResizableComponent {

    expanded: boolean;
    // spTargets; // Vocab...? Subclass for SPA networks?
    // defaultOutput;
    gClass: string[];
    gNetworks: SVGElement;

    protected _depth: number;
    protected _view: NetworkView;

    constructor(
        left: number,
        top: number,
        width: number,
        height: number,
        parent: string,
        uid: string,
        dimensions: number,
        miniItem = null,
        expanded = false,
        depth = 0,
        defaultOutput = null,
    ) {
        super(left, top, width, height, parent, uid, dimensions, miniItem);

        this.expanded = expanded;
        this.depth = depth;
        // this.defaultOutput = defaultOutput;

        // Do in expanded or depth setter?
        // this.computeFill();
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

    set transparent(val: boolean ) {
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
            this.createModal();
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
        this.menu.addAction("Collapse network", () => {
            netgraph.collapse(this);
        }, () => this.expanded);
        this.menu.addAction("Auto-layout", () => {
            this.requestFeedforwardLayout();
        }, () => this.expanded);
        this.menu.addAction("Expand network", () => {
            netgraph.expand(this);
        }, () => !this.expanded);

        this.interactable.on("doubletap", (event) => {
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

        super.onnetgraphadd(netgraph)
    }
}
