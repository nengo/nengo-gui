import { ResizableModelObj } from "./base";
import { config } from "../config";
import { Menu } from "../menu";
import { NetworkView } from "./views/network";

export class Network extends ResizableModelObj {
    expanded: boolean;
    // TODO: what type is this supposed to be?
    spTargets;
    defaultOutput;
    gClass: string[];
    gNetworks: SVGElement;

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
        spTargets = null,
        defaultOutput = null,
    ) {
        super(left, top, width, height, parent, uid, dimensions, miniItem);

        // TODO: This use of gItems and gNetworks is definitely wrong
        // this.gNetworks = this.ng.view.gNetworks;

        this.expanded = expanded;
        this.spTargets = spTargets;
        this.defaultOutput = defaultOutput;

        // Set of NetGraphItems and NetGraphConnections that are inside
        // this network
        this.children = [];
        this.childConnections = [];

        this.computeFill();

        // If a network is flagged to expand on creation, then expand it
        if (expanded) {
            // Report to server but do not add to the undo stack
            this.expand(true, true);
        }

        // TODO: Is this the right way to override an interact method?
        this.interactable.on("doubletap", (event) => {
            // Get rid of menus when clicking off
            if (event.button === 0) {
                if (Menu.shown !== null) {
                    Menu.hideShown();
                } else {
                    if (this.expanded) {
                        this.collapse(true);
                    } else {
                        this.expand();
                    }
                }
            }
        });

        this.interactable.on("dragstart", () => {
            Menu.hideShown();
            this.moveToFront();
        });
    }

    get transparentNets(): boolean {
        return config.transparentNets;
    }

    // TODO: this feels like a weird level to manipulate all other
    // networks from. Should push up to NetGraph
    set transparentNets(val: boolean) {
        if (val === config.transparentNets) {
            return;
        }
        config.transparentNets = val;
        // Object.keys(this.ng.svgObjects.net).forEach((key) => {
        //     const net = this.ng.svgObjects.net[key];
        //     net.computeFill();
        //     if (net.expanded) {
        //         net.view.transparentShape(val);
        //     }
        // });
    }

    get view(): NetworkView {
        if (this._view === null) {
            this._view = new NetworkView("?");
        }
        return this._view;
    }

    addMenuItems() {
        this.menu.addAction("Collapse network", () => {
            this.collapse(true);
        }, () => this.expanded);
        this.menu.addAction("Auto-layout", () => {
            this.requestFeedforwardLayout();
        }, () => this.expanded);
        this.menu.addAction("Expand network", () => {
            this.expand();
        }, () => !this.expanded);
        this.menu.addAction("Output Value", () => {
            this.createGraph("Value");
        }, () => this.defaultOutput && this.spTargets.length === 0);
        this.menu.addAction("Semantic pointer cloud", () => {
            this.createGraph("Pointer", this.spTargets[0]);
        }, () => this.spTargets.length > 0);
        this.menu.addAction("Semantic pointer plot", () => {
            this.createGraph("SpaSimilarity", this.spTargets[0]);
        }, () => this.spTargets.length > 0);
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
        const fill = Math.round(255 * Math.pow(0.8, depth));
        const stroke = Math.round(255 * Math.pow(0.8, depth + 2));
        this.view.fill = `rgb(${fill},${fill},${fill})`;
        this.view.stroke = `rgb(${stroke},${stroke},${stroke})`;
    }

    /**
     * Expand a collapsed network.
     */
    expand(returnToServer = true, auto = false) {
        // Default to true if no parameter is specified
        if (typeof returnToServer !== "undefined") {
            returnToServer = true;
        }
        auto = typeof auto !== "undefined" ? auto : false;

        this.gClass.push("expanded");

        if (!this.expanded) {
            this.expanded = true;
            // if (this.ng.transparentNets) {
            //     this.view.transparentShape(false);
            // }
            // this.ng.view.gItems.removeChild(this.view.g);
            // this.gNetworks.appendChild(this.view.g);
            if (!this.minimap) {
                this.miniItem.expand(returnToServer, auto);
            }
        } else {
            console.warn(
                "expanded a network that was already expanded: " + this);
        }

        if (returnToServer) {
            // if (auto) {
            //     // Update the server, but do not place on the undo stack
            //     this.ng.notify("autoExpand", {uid: this.uid});
            // } else {
            //     this.ng.notify("expand", {uid: this.uid});
            // }
        }
    }

    /**
     * Collapse an expanded network.
     */
    collapse(reportToServer, auto=false) { // tslint:disable-line
        this.gClass.pop();

        // Remove child NetGraphItems and NetGraphConnections
        while (this.childConnections.length > 0) {
            this.childConnections[0].remove();
        }
        while (this.children.length > 0) {
            this.children[0].remove();
        }

        if (this.expanded) {
            this.expanded = false;
            // if (this.ng.transparentNets) {
            //     this.view.transparentShape(false);
            // }
            // this.gNetworks.removeChild(this.view.g);
            // this.ng.view.gItems.appendChild(this.view.g);
            // if (!this.minimap) {
            //     this.miniItem.collapse(reportToServer, auto);
            // }
        } else {
            console.warn(
                "collapsed a network that was already collapsed: " + this);
        }

        if (reportToServer) {
            // if (auto) {
            //     // Update the server, but do not place on the undo stack
            //     this.ng.notify("autoCollapse", {uid: this.uid});
            // } else {
            //     this.ng.notify("collapse", {uid: this.uid});
            // }
        }
    }

    moveToFront() {
        // this.view.parent.ng.view.gItems.appendChild(this.view.g);

        // Object.keys(this.children).forEach((key) => {
        //     this.children[key].moveToFront();
        // });
    }

    // redraw() {
    //     super.redraw();
    //     this.redrawChildren();
    //     this.redrawChildConnections();
    //     this.redrawConnections();
    // }

    // redrawChildren() {
    //     // Update any children's positions
    //     for (const child of this.children) {
    //         child.redraw();
    //     }
    // }

    // redrawChildConnections() {
    //     // Update any children's positions
    //     for (const child of this.childConnections) {
    //         child.redraw();
    //     }
    // }

    remove() {
        super.remove();
        if (this.expanded) {
            // Collapse the item, but don't tell the server since that would
            // update the server's config
            this.collapse(false);
        }
    }
}
