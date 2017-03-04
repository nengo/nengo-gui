import * as interact from "interact.js";
import { VNode, dom, h  } from "maquette";

import { config } from "../../config";
import { hideAllMenus } from "../../menu";
import { Shape, domCreateSvg } from "../../utils";
import { InteractableItem, InteractableItemArg } from "./interactable";
import { NetGraphItemArg } from "./item";

abstract class ResizableItem extends InteractableItem {
    area: SVGElement;
    dimensions: number;

    constructor(ngiArg: NetGraphItemArg, interArg: InteractableItemArg,
                dimensions) {
        super(ngiArg, interArg, dimensions);

        const area = h("rect", {fill: "transparent"});
        this.area = domCreateSvg(area);
        this.view.g.appendChild(this.area);

        interact(this.area).resizable({
                edges: {bottom: true, left: true, right: true, top: true},
                invert: "none",
                margin: 10,
            }).on("resizestart", event => {
                hideAllMenus();
            }).on("resizemove", event => {
                const item = this.ng.svgObjects[this.uid];
                let hScale = this.ng.scaledWidth;
                let vScale = this.ng.scaledHeight;
                let parent = item.parent;
                while (parent !== null) {
                    hScale = hScale * parent.width * 2;
                    vScale = vScale * parent.height * 2;
                    parent = parent.parent;
                }
                this.contSize(event, item, hScale, vScale);
                item.redraw();

                if (this.view.depth === 1) {
                    this.ng.scaleMiniMap();
                }
            }).on("resizeend", event => {
                const item = this.ng.svgObjects[this.uid];
                item.constrainPosition();
                item.redraw();
                this.ng.notify("posSize", {
                    height: item.height,
                    uid: this.uid,
                    width: item.width,
                    x: item.x,
                    y: item.y,
                });
            });
    }

    contSize(event, item, hScale: number, vScale: number) {
        const dw = event.deltaRect.width / hScale / 2;
        const dh = event.deltaRect.height / vScale / 2;
        const offsetX = dw + event.deltaRect.left / hScale;
        const offsetY = dh + event.deltaRect.top / vScale;

        item.width += dw;
        item.height += dh;
        item.x += offsetX;
        item.y += offsetY;
    }

    redrawSize(): Shape {
        const screenD = super.redrawSize();

        const areaW = screenD.width;
        const areaH = screenD.height;
        this.area.setAttribute(
            "transform",
            String("translate(-" + (areaW / 2) + ", -" + (areaH / 2) + ")")
        );
        this.area.setAttribute("width", String(areaW));
        this.area.setAttribute("height", String(areaH));

        this.view.shape.setAttribute("width", String(screenD.width));
        this.view.shape.setAttribute("height", String(screenD.height));

        return screenD;
    }
}

export class NodeItem extends ResizableItem {
    htmlNode;
    radiusScale: number;

    constructor(ngiArg: NetGraphItemArg, interArg: InteractableItemArg,
                dimensions, html) {
        super(ngiArg, interArg, dimensions);
        this.radiusScale = .1;
        this.htmlNode = html;
        this._renderShape();
        this.redraw();
    }

    _renderShape() {
        const screenD = this.view.displayedShape;
        const halfW = screenD.width / 2;
        const halfH = screenD.height / 2;
        const shape = h("rect.node", {
            transform: "translate(-" + halfW + ", -" + halfH + ")",
        });
        this.view.shape = domCreateSvg(shape);
        this.view.g.appendChild(this.view.shape);
        this.redraw();
    }

    generateMenu() {
        const items = [];

        items.push({
            html: "Slider",
            callback: () => {
                this.createGraph("Slider");
            },
        });
        if (this.dimensions > 0) {
            items.push(["Value", () => {
                this.createGraph("Value");
            }]);
        }
        if (this.dimensions > 1) {
            items.push(["XY-value", () => {
                this.createGraph("XYValue");
            }]);
        }
        if (this.htmlNode) {
            items.push(["HTML", () => {
                this.createGraph("HTMLView");
            }]);
        }

        items.push(["Details ...", () => {
            this.createModal();
        }]);
        return items;
    }

    redrawSize() {
        const screenD = super.redrawSize();

        const radius = Math.min(screenD.width, screenD.height);
        this.view.shape.setAttribute("rx", String(radius * this.radiusScale));
        this.view.shape.setAttribute("ry", String(radius * this.radiusScale));

        return screenD;
    }
}

export class NetItem extends ResizableItem {
    expanded: boolean;
    spTargets;
    defaultOutput;
    gClass: string[];
    gNetworks: SVGElement;

    constructor(ngiArg: NetGraphItemArg, interArg: InteractableItemArg,
                dimensions, expanded, spTargets, defaultOutput) {
        super(ngiArg, interArg, dimensions);

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
        interact(this.view.g).on("doubletap", event => {
                // Get rid of menus when clicking off
                if (event.button === 0) {
                    if (this.menu.visibleAny()) {
                        hideAllMenus();
                    } else {
                        if (this.expanded) {
                            this.collapse(true);
                        } else {
                            this.expand();
                        }
                    }
                }
            });
        interact(this.view.g).draggable({
            onstart: () => {
                hideAllMenus();
                this.moveToFront();
            },
        });
    }

    _renderShape() {
        const shape = h("rect.network");
        this.view.shape = dom.create(shape).domNode as SVGElement;
        this.view.g.appendChild(this.view.shape);
        this.redraw();
    }

    remove() {
        super.remove();
        if (this.expanded) {
            // Collapse the item, but don't tell the server since that would
            // update the server's config
            this.collapse(false);
        }
    }

    generateMenu() {
        const items = [];
        if (this.expanded) {
            items.push(["Collapse network", () => {
                this.collapse(true);
            }]);
            items.push(["Auto-layout", () => {
                this.requestFeedforwardLayout();
            }]);
        } else {
            items.push(["Expand network", () => {
                this.expand();
            }]);
        }
        if (this.defaultOutput && this.spTargets.length === 0) {
            items.push(["Output Value", () => {
                this.createGraph("Value");
            }]);
        }

        if (this.spTargets.length > 0) {
            items.push(["Semantic pointer cloud", () => {
                this.createGraph("Pointer", this.spTargets[0]);
            }]);
            items.push(["Semantic pointer plot", () => {
                this.createGraph("SpaSimilarity", this.spTargets[0]);
            }]);
        }

        items.push(["Details ...", () => {
            this.createModal();
        }]);
        return items;
    }

    requestFeedforwardLayout() {
        this.ng.notify("feedforwardLayout", {uid: this.uid});
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
                this.view.shape.setAttribute("style", "fill-opacity=0.0");
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
                this.view.shape.setAttribute("style", "fill-opacity=0.0");
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
    // networks from
    set transparentNets(val: boolean) {
        if (val === config.transparentNets) {
            return;
        }
        config.transparentNets = val;
        Object.keys(this.ng.svgObjects.net).forEach(key => {
            const ngi = this.ng.svgObjects.net[key];
            ngi.computeFill();
            if (ngi.expanded) {
                ngi.view.shape.setAttribute(
                    "style", String("fill-opacity=" + val)
                );
            }
        });
    }

    moveToFront() {
        this.view.parent.ng.view.gItems.appendChild(this.view.g);

        Object.keys(this.children).forEach(key => {
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
        for (let i = 0; i < this.children.length; i++) {
            this.children[i].redraw();
        }
    }

    redrawChildConnections() {
        // Update any children's positions
        for (let i = 0; i < this.childConnections.length; i++) {
            this.childConnections[i].redraw();
        }
    }

    /**
     * Determine the fill color based on the depth.
     */
    computeFill() {
        const depth = this.ng.transparentNets ? 1 : this.view.depth;

        let rgb = Math.round(255 * Math.pow(0.8, depth));
        const fill = "rgb(" + rgb + "," + rgb + "," + rgb + ")";

        rgb = Math.round(255 * Math.pow(0.8, depth + 2));
        const stroke = "rgb(" + rgb + "," + rgb + "," + rgb + ")";

        this.view.shape.setAttribute(
            "style", String("fill=" + fill + ", stroke=" + stroke)
        );
    }
}

export class EnsembleItem extends ResizableItem {
    aspect: number;
    radiusScale: number;

    constructor(ngiArg: NetGraphItemArg, interArg: InteractableItemArg,
                dimensions) {
        super(ngiArg, interArg, dimensions);

        // the ensemble is the only thing with aspect
        this.aspect = 1.;
        this.radiusScale = 17.8;
        interact(this.area).resizable({
            invert: "reposition",
        });
    }

    /**
     * Function for drawing ensemble svg.
     */
    _renderShape() {
        const shape = h("g.ensemble");

        const dx = -1.25;
        const dy = 0.25;

        let circle: VNode;

        circle = h("circle", {cx: -11.157 + dx, cy: -7.481 + dy, r: "4.843"});
        shape.children.push(circle);
        circle = h("circle", {cx: 0.186 + dx, cy: -0.127 + dy, r: "4.843"});
        shape.children.push(circle);
        circle = h("circle", {cx: 5.012 + dx, cy: 12.56 + dy, r: "4.843"});
        shape.children.push(circle);
        circle = h("circle", {cx: 13.704 + dx, cy: -0.771 + dy, r: "4.843"});
        shape.children.push(circle);
        circle = h("circle", {cx: -10.353 + dx, cy: 8.413 + dy, r: "4.843"});
        shape.children.push(circle);
        circle = h("circle", {cx: 3.894 + dx, cy: -13.158 + dy, r: "4.843"});
        shape.children.push(circle);

        this.view.shape = dom.create(shape).domNode as SVGElement;
        this.view.g.appendChild(this.view.shape);
        this.redraw();
    }

    generateMenu() {
        const items = [];
        items.push(["Value", () => {
            this.createGraph("Value");
        }]);
        if (this.dimensions > 1) {
            items.push(["XY-value", () => {
                this.createGraph("XYValue");
            }]);
        }
        items.push(["Spikes", () => {
            this.createGraph("Raster");
        }]);
        items.push(["Voltages", () => {
            this.createGraph("Voltage");
        }]);
        items.push(["Firing pattern", () => {
            this.createGraph("SpikeGrid");
        }]);

        items.push(["Details ...", () => {
            this.createModal();
        }]);
        return items;
    }

    contSize(event, item, hScale, vScale) {
        const pos = item.getScreenLocation();
        const verticalResize =
            event.edges.bottom || event.edges.top;
        const horizontalResize =
            event.edges.left || event.edges.right;

        let w = pos[0] - event.clientX + this.ng.offsetX;
        let h = pos[1] - event.clientY + this.ng.offsetY;

        if (event.edges.right) {
            w *= -1;
        }
        if (event.edges.bottom) {
            h *= -1;
        }
        if (w < 0) {
            w = 1;
        }
        if (h < 0) {
            h = 1;
        }

        const screenW = item.width * hScale;
        const screenH = item.height * vScale;

        if (horizontalResize && verticalResize) {
            const p = (screenW * w + screenH * h) / Math.sqrt(
                screenW * screenW + screenH * screenH);
            const norm = Math.sqrt(
                this.aspect * this.aspect + 1);
            h = p / (this.aspect / norm);
            w = p * (this.aspect / norm);
        } else if (horizontalResize) {
            h = w / this.aspect;
        } else {
            w = h * this.aspect;
        }

        item.width = w / hScale;
        item.height = h / vScale;
    }

    getDisplayedSize() {
        const hScale = this.ng.scaledWidth;
        const vScale = this.ng.scaledHeight;
        // TODO: get nested implemented
        // let w = this.nestedWidth * hScale;
        // let h = this.nestedHeight * vScale;
        let w = this.view.width * hScale;
        let h = this.view.height * vScale;

        if (h * this.aspect < w) {
            w = h * this.aspect;
        } else if (w / this.aspect < h) {
            h = w / this.aspect;
        }

        return [w / hScale, h / vScale];
    }


    redrawSize() {
        const screenD = super.redrawSize();

        if (screenD.height * this.aspect < screenD.width) {
            screenD.width = screenD.height * this.aspect;
        } else if (screenD.width / this.aspect < screenD.height) {
            screenD.height = screenD.width / this.aspect;
        }

        const width = screenD.width;
        const height = screenD.height;
        const scale = Math.sqrt(height * height + width * width) / Math.sqrt(2);

        this.view.shape.setAttribute(
            "transform",
            String("scale(" + scale / 2 / this.radiusScale + ")")
        );
        this.view.shape.setAttribute(
            "style",  String("stroke-width" + 20 / scale),
        );

        this.area.setAttribute(
            "width", String(width * 0.97),
        );

        return screenD;
    }
}
