import * as interact from "interact.js";
import { dom, h, VNode } from "maquette";

import { config } from "../../config";
import { Menu } from "../../menu";
import { domCreateSvg, Shape } from "../../utils";
import { InteractableItem, InteractableItemArg } from "./interactable";
import { NetGraphItemArg } from "./item";
import { EnsembleView, NetView,
         NodeView, ResizeableView } from "./views/resizable";

abstract class ResizableItem extends InteractableItem {
    dimensions: number;
    view: ResizeableView;

    constructor(ngiArg: NetGraphItemArg, interArg: InteractableItemArg,
                dimensions) {
        super(ngiArg, interArg, dimensions);

        interact(this.view.area).resizable({
                edges: {bottom: true, left: true, right: true, top: true},
                invert: "none",
                margin: 10,
            }).on("resizestart", (event) => {
                Menu.hideAll();
            }).on("resizemove", (event) => {
                this.view.contSize(event);
                this.redraw();

                if (this.view.depth === 1) {
                    this.ng.scaleMiniMap();
                }
            }).on("resizeend", (event) => {
                this.view.constrainPosition();
                this.redraw();

                // TODO: turn this into an actual function call
                this.ng.notify("posSize", {
                    height: this.view.height,
                    uid: this.uid,
                    width: this.view.width,
                    x: this.view.x,
                    y: this.view.y,
                });
            });
    }
}

export class NodeItem extends ResizableItem {
    htmlNode;
    view: NodeView;

    constructor(ngiArg: NetGraphItemArg, interArg: InteractableItemArg,
                dimensions, html) {
        super(ngiArg, interArg, dimensions);
        this.alias = "node";
        this.htmlNode = html;
        this.view = new NodeView(ngiArg, interArg);
    }

    addMenuItems() {
        this.menu.addAction("Slider", () => {
                this.createGraph("Slider");
            },
        );
        if (this.dimensions > 0) {
            this.menu.addAction("Value", () => {
                this.createGraph("Value");
            });
        }
        if (this.dimensions > 1) {
            this.menu.addAction("XY-value", () => {
                this.createGraph("XYValue");
            });
        }
        if (this.htmlNode) {
            this.menu.addAction("HTML", () => {
                this.createGraph("HTMLView");
            });
        }

        this.menu.addAction("Details ...", () => {
            this.createModal();
        });
    }
}

export class EnsembleItem extends ResizableItem {
    view: EnsembleView;

    constructor(ngiArg: NetGraphItemArg, interArg: InteractableItemArg,
                dimensions) {
        super(ngiArg, interArg, dimensions);
        this.alias = "ens";
        this.view = new EnsembleView(ngiArg, interArg);
    }

    addMenuItems() {
        this.menu.addAction("Value", () => {
            this.createGraph("Value");
        });
        if (this.dimensions > 1) {
            this.menu.addAction("XY-value", () => {
                this.createGraph("XYValue");
            });
        }
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
            this.createModal();
        });
    }
}

export class NetItem extends ResizableItem {
    expanded: boolean;
    // TODO: what type is this supposed to be?
    spTargets;
    defaultOutput;
    gClass: string[];
    gNetworks: SVGElement;
    view: NetView;

    constructor(ngiArg: NetGraphItemArg, interArg: InteractableItemArg,
                dimensions, expanded, spTargets, defaultOutput) {
        super(ngiArg, interArg, dimensions);
        this.alias = "net";
        this.view = new NetView(ngiArg, interArg);

        // TODO: This use of gItems and gNetworks is definitely wrong
        this.gNetworks = this.ng.view.gNetworks;
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
        interact(this.view.g).on("doubletap", (event) => {
                // Get rid of menus when clicking off
                if (event.button === 0) {
                    if (Menu.anyVisible()) {
                        Menu.hideAll();
                    } else {
                        if (this.expanded) {
                            this.collapse(true);
                        } else {
                            this.expand();
                        }
                    }
                }
            })
        .draggable({
            onstart: () => {
                Menu.hideAll();
                this.moveToFront();
            },
        });
    }

    remove() {
        super.remove();
        if (this.expanded) {
            // Collapse the item, but don't tell the server since that would
            // update the server's config
            this.collapse(false);
        }
    }

    addMenuItems() {
        if (this.expanded) {
            this.menu.addAction("Collapse network", () => {
                this.collapse(true);
            });
            this.menu.addAction("Auto-layout", () => {
                this.requestFeedforwardLayout();
            });
        } else {
            this.menu.addAction("Expand network", () => {
                this.expand();
            });
        }

        if (this.defaultOutput && this.spTargets.length === 0) {
            this.menu.addAction("Output Value", () => {
                this.createGraph("Value");
            });
        }

        if (this.spTargets.length > 0) {
            this.menu.addAction("Semantic pointer cloud", () => {
                this.createGraph("Pointer", this.spTargets[0]);
            });
            this.menu.addAction("Semantic pointer plot", () => {
                this.createGraph("SpaSimilarity", this.spTargets[0]);
            });
        }

        this.menu.addAction("Details ...", () => {
            this.createModal();
        });
    }

    /**
     * Expand a collapsed network.
     */
    expand(returnToServer=true, auto=false) { // tslint:disable-line
        // Default to true if no parameter is specified
        if (typeof returnToServer !== "undefined") {
            returnToServer = true;
        }
        auto = typeof auto !== "undefined" ? auto : false;

        this.gClass.push("expanded");

        if (!this.expanded) {
            this.expanded = true;
            if (this.ng.transparentNets) {
                this.view.transparentShape(false);
            }
            this.ng.view.gItems.removeChild(this.view.g);
            this.gNetworks.appendChild(this.view.g);
            if (!this.minimap) {
                this.miniItem.expand(returnToServer, auto);
            }
        } else {
            console.warn(
                "expanded a network that was already expanded: " + this);
        }

        if (returnToServer) {
            if (auto) {
                // Update the server, but do not place on the undo stack
                this.ng.notify("autoExpand", {uid: this.uid});
            } else {
                this.ng.notify("expand", {uid: this.uid});
            }
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
            if (this.ng.transparentNets) {
                this.view.transparentShape(false);
            }
            this.gNetworks.removeChild(this.view.g);
            this.ng.view.gItems.appendChild(this.view.g);
            if (!this.minimap) {
                this.miniItem.collapse(reportToServer, auto);
            }
        } else {
            console.warn(
                "collapsed a network that was already collapsed: " + this);
        }

        if (reportToServer) {
            if (auto) {
                // Update the server, but do not place on the undo stack
                this.ng.notify("autoCollapse", {uid: this.uid});
            } else {
                this.ng.notify("collapse", {uid: this.uid});
            }
        }
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
        Object.keys(this.ng.svgObjects.net).forEach((key) => {
            const net = this.ng.svgObjects.net[key];
            net.computeFill();
            if (net.expanded) {
                net.view.transparentShape(val);
            }
        });
    }

    moveToFront() {
        this.view.parent.ng.view.gItems.appendChild(this.view.g);

        Object.keys(this.children).forEach((key) => {
            this.children[key].moveToFront();
        });
    }

    redraw() {
        super.redraw();
        this.redrawChildren();
        this.redrawChildConnections();
        this.redrawConnections();
    }

    redrawChildren() {
        // Update any children's positions
        for (const child of this.children) {
            child.redraw();
        }
    }

    redrawChildConnections() {
        // Update any children's positions
        for (const child of this.childConnections) {
            child.redraw();
        }
    }

    /**
     * Determine the fill color based on the depth.
     */
    computeFill() {
        const depth = this.ng.transparentNets ? 1 : this.view.depth;
        const fill = Math.round(255 * Math.pow(0.8, depth));
        const stroke = Math.round(255 * Math.pow(0.8, depth + 2));
        this.view.shapeFill(fill, stroke);
    }
}
