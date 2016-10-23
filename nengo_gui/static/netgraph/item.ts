/**
 * Network diagram individual item (node).
 *
 * @constructor
 * @param {NetGraph} ng - The NetGraph this Item is inside
 * @param {dict} info - A dictionary of settings for the item, including:
 * @param {float[]} info.pos - x,y position
 * @param {float[]} info.size - half width, half height of item
 * @param {string} info.type - one of ["net", "ens", "node"]
 * @param {string} info.uid - unique identifier
 * @param {string|null} info.parent - a NetGraphItem with .type=="net"
 */

import * as interact from "interact.js";
import * as $ from "jquery";

import * as menu from "../menu";
import * as viewport from "../viewport";

export class NetGraphItem {
    area;
    aspect;
    childConnections;
    children;
    connIn;
    connOut;
    defaultOutput;
    depth;
    dimensions;
    expanded;
    fixedHeight;
    fixedWidth;
    g;
    gItems;
    gNetworks;
    htmlNode;
    label;
    labelBelow;
    menu;
    minHeight;
    minWidth;
    miniItem;
    minimap;
    ng;
    parent;
    passthrough;
    shape;
    size;
    spTargets;
    type;
    uid;
    private _height;
    private _width;
    private _x;
    private _y;

    constructor(ng, info, minimap, miniItem) {
        this.ng = ng;
        this.type = info.type;
        this.uid = info.uid;
        this.spTargets = info.spTargets;
        this.defaultOutput = info.defaultOutput;
        this.passthrough = info.passthrough;
        this.fixedWidth = null;
        this.fixedHeight = null;
        this.dimensions = info.dimensions;
        this.minimap = minimap;
        this.htmlNode = info.html;
        if (minimap === false) {
            this.gNetworks = this.ng.gNetworks;
            this.gItems = this.ng.gItems;
            this.miniItem = miniItem;
        } else {
            this.gNetworks = this.ng.gNetworksMini;
            this.gItems = this.ng.gItemsMini;
        }

        this._width = info.size[0];
        this._height = info.size[1];
        this._x = info.pos[0];
        this._y = info.pos[1];

        // If this is a network, the children list is the set of NetGraphItems
        // and NetGraphConnections that are inside this network.
        this.children = [];
        this.childConnections = [];

        // NetGraphConnections leading into and out of this item
        this.connOut = [];
        this.connIn = [];

        // Minimum and maximum drawn size, in pixels
        this.minWidth = 5;
        this.minHeight = 5;
        this.aspect = null;

        this.expanded = false;

        // Determine the parent NetGraphItem (if any) and the nested depth
        // of this item.
        if (info.parent === null) {
            this.parent = null;
            this.depth = 1;
        } else {
            this.parent = this.ng.svgObjects[info.parent];
            this.depth = this.parent.depth + 1;
            if (!minimap) {
                this.parent.children.push(this);
            }
        }

        // Create the SVG group to hold this item
        const g = this.ng.createSVGElement("g");
        this.g = g;
        this.gItems.appendChild(g);
        g.classList.add(this.type);

        this.area = this.ng.createSVGElement("rect");
        this.area.style.fill = "transparent";

        this.menu = new menu.Menu(this.ng.parent);

        // Different types use different SVG elements for display
        if (info.type === "node") {
            if (this.passthrough) {
                this.shape = this.ng.createSVGElement("ellipse");
                if (this.minimap === false) {
                    this.fixedWidth = 10;
                    this.fixedHeight = 10;
                } else {
                    this.fixedWidth = 3;
                    this.fixedHeight = 3;
                }
                this.g.classList.add("passthrough");
            } else {
                this.shape = this.ng.createSVGElement("rect");
            }
        } else if (info.type === "net") {
            this.shape = this.ng.createSVGElement("rect");
        } else if (info.type === "ens") {
            this.aspect = 1.;
            this.shape = this.ensembleSvg();
        } else {
            console.warn("Unknown NetGraphItem type:" + info.type);
        }

        this.computeFill();

        if (this.minimap === false) {
            const label = this.ng.createSVGElement("text");
            this.label = label;
            label.innerHTML = info.label;
            g.appendChild(label);
        }

        g.appendChild(this.shape);
        g.appendChild(this.area);

        this.redraw();

        if (!this.minimap) {
            // Dragging an item to change its position
            const uid = this.uid;
            interact(g).draggable({
                onend: event => {
                    const item = this.ng.svgObjects[uid];
                    item.constrainPosition();
                    this.ng.notify({
                        act: "pos", uid: uid, x: item.x, y: item.y,
                    });

                    item.redraw();
                },
                onmove: event => {
                    const item = this.ng.svgObjects[uid];
                    let w = this.ng.getScaledWidth();
                    let h = this.ng.getScaledHeight();
                    let parent = item.parent;
                    while (parent !== null) {
                        w *= parent.width * 2;
                        h *= parent.height * 2;
                        parent = parent.parent;
                    }
                    item.x += event.dx / w;
                    item.y += event.dy / h;
                    item.redraw();

                    if (this.depth === 1) {
                        this.ng.scaleMiniMap();
                    }
                },
                onstart: () => {
                    menu.hideAny();
                    this.moveToFront();
                },
            });

            if (!this.passthrough) {
                // Dragging the edge of item to change its size
                let tmp = this.shape;
                if (info.type === "ens") {
                    tmp = $(this.shape.getElementsByClassName("mainCircle"))[0];
                }
                interact(this.area).resizable({
                    edges: {bottom: true, left: true, right: true, top: true},
                    invert: this.type === "ens" ? "reposition" : "none",
                    margin: 10,
                }).on("resizestart", event => {
                    menu.hideAny();
                }).on("resizemove", event => {
                    const item = this.ng.svgObjects[uid];
                    const pos = item.getScreenLocation();
                    let hScale = this.ng.getScaledWidth();
                    let vScale = this.ng.getScaledHeight();
                    let parent = item.parent;
                    while (parent !== null) {
                        hScale = hScale * parent.width * 2;
                        vScale = vScale * parent.height * 2;
                        parent = parent.parent;
                    }

                    if (this.aspect !== null) {
                        this.constrainAspect();

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
                    } else {
                        const dw = event.deltaRect.width / hScale / 2;
                        const dh = event.deltaRect.height / vScale / 2;
                        const offsetX = dw + event.deltaRect.left / hScale;
                        const offsetY = dh + event.deltaRect.top / vScale;

                        item.width += dw;
                        item.height += dh;
                        item.x += offsetX;
                        item.y += offsetY;
                    }

                    item.redraw();

                    if (this.depth === 1) {
                        this.ng.scaleMiniMap();
                    }
                }).on("resizeend", event => {
                    const item = this.ng.svgObjects[uid];
                    item.constrainPosition();
                    item.redraw();
                    this.ng.notify({
                        act: "posSize",
                        height: item.height,
                        uid: uid,
                        width: item.width,
                        x: item.x,
                        y: item.y,
                    });
                });
            }

            // Determine when to pull up the menu
            interact(this.g)
                .on("hold", event => {
                    // Change to "tap" for right click
                    if (event.button === 0) {
                        if (this.menu.visibleAny()) {
                            menu.hideAny();
                        } else {
                            this.menu.show(event.clientX,
                                           event.clientY,
                                           this.generateMenu());
                        }
                        event.stopPropagation();
                    }
                })
                .on("tap", event => {
                    // Get rid of menus when clicking off
                    if (event.button === 0) {
                        if (this.menu.visibleAny()) {
                            menu.hideAny();
                        }
                    }
                })
                .on("doubletap", event => {
                    // Get rid of menus when clicking off
                    if (event.button === 0) {
                        if (this.menu.visibleAny()) {
                            menu.hideAny();
                        } else if (this.type === "net") {
                            if (this.expanded) {
                                this.collapse(true);
                            } else {
                                this.expand();
                            }
                        }
                    }
                });
            $(this.g).bind("contextmenu", event => {
                event.preventDefault();
                event.stopPropagation();
                if (this.menu.visibleAny()) {
                    menu.hideAny();
                } else {
                    this.menu.show(
                        event.clientX, event.clientY, this.generateMenu());
                }
            });

            if (info.type === "net") {
                // If a network is flagged to expand on creation, then expand it
                if (info.expanded) {
                    // Report to server but do not add to the undo stack
                    this.expand(true, true);
                }
            }
        }
    }

    get height(): number {
        return this._height;
    }

    set height(val: number) {
        this._height = val;

        if (!this.minimap) {
            this.miniItem.height = val;
        }
    }

    get width(): number {
        return this._width;
    }

    set width(val: number) {
        this._width = val;

        if (!this.minimap) {
            this.miniItem.width = val;
        }
    }

    get x(): number {
        return this._x;
    }

    set x(val: number) {
        this._x = val;

        if (!this.minimap) {
            this.miniItem.x = val;
        }
    }

    get y(): number {
        return this._y;
    }

    set y(val: number) {
        this._y = val;

        if (!this.minimap) {
            this.miniItem.y = val;
        }
    }

    setLabel(label) {
        this.label.innerHTML = label;
    }

    moveToFront() {
        this.g.parentNode.appendChild(this.g);

        Object.keys(this.children).forEach(key => {
            this.children[key].moveToFront();
        });
    }

    generateMenu() {
        const items = [];
        if (this.type === "net") {
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
        }
        if (this.type === "ens") {
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
        }
        if (this.type === "node") {
            items.push(["Slider", () => {
                this.createGraph("Slider");
            }]);
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
        }
        if (this.spTargets.length > 0) {
            items.push(["Semantic pointer cloud", () => {
                this.createGraph("Pointer", this.spTargets[0]);
            }]);
            items.push(["Semantic pointer plot", () => {
                this.createGraph("SpaSimilarity", this.spTargets[0]);
            }]);
        }
        // TODO: Enable input and output value plots for basal ganglia network
        items.push(["Details ...", () => {
            this.createModal();
        }]);
        return items;
    }

    createGraph(type, args=null) { // tslint:disable-line
        const w = this.getNestedWidth();
        const h = this.getNestedHeight();
        const pos = this.getScreenLocation();

        const info: any = {
            "act": "createGraph",
            "height": viewport.fromScreenY(100),
            "type": type,
            "uid": this.uid,
            "width": viewport.fromScreenX(100),
            "x": viewport.fromScreenX(pos[0]) - viewport.shiftX(w),
            "y": viewport.fromScreenY(pos[1]) - viewport.shiftY(h),
        };

        if (args !== null) {
            info.args = args;
        }

        if (info.type === "Slider") {
            info.width /= 2;
        }

        this.ng.notify(info);
    }

    createModal() {
        this.ng.notify({
            "act": "createModal",
            "connInUids": this.connIn.map(c => {
                return c.uid;
            }),
            "connOutUids": this.connOut.map(c => {
                return c.uid;
            }),
            "uid": this.uid,
        });
    }

    requestFeedforwardLayout() {
        this.ng.notify({act: "feedforwardLayout", uid: this.uid});
    }

    /**
     * Expand a collapsed network.
     */
    expand(rts=true, auto=false) { // tslint:disable-line
        // Default to true if no parameter is specified
        rts = typeof rts !== "undefined" ? rts : true;
        auto = typeof auto !== "undefined" ? auto : false;

        this.g.classList.add("expanded");

        if (!this.expanded) {
            this.expanded = true;
            if (this.ng.transparentNets) {
                this.shape.style["fill-opacity"] = 0.0;
            }
            this.gItems.removeChild(this.g);
            this.gNetworks.appendChild(this.g);
            if (!this.minimap) {
                this.miniItem.expand(rts, auto);
            }
        } else {
            console.warn(
                "expanded a network that was already expanded: " + this);
        }

        if (rts) {
            if (auto) {
                // Update the server, but do not place on the undo stack
                this.ng.notify({act: "autoExpand", uid: this.uid});
            } else {
                this.ng.notify({act: "expand", uid: this.uid});
            }
        }
    }

    setLabelBelow(flag) {
        if (flag && !this.labelBelow) {
            const screenH = this.getScreenHeight();
            this.label.setAttribute(
                "transform", "translate(0, " + (screenH / 2) + ")");
        } else if (!flag && this.labelBelow) {
            this.label.setAttribute("transform", "");
        }
    }

    /**
     * Collapse an expanded network.
     */
    collapse(reportToServer, auto=false) { // tslint:disable-line
        this.g.classList.remove("expanded");

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
                this.shape.style["fill-opacity"] = 1.0;
            }
            this.gNetworks.removeChild(this.g);
            this.gItems.appendChild(this.g);
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
                this.ng.notify({act: "autoCollapse", uid: this.uid});
            } else {
                this.ng.notify({act: "collapse", uid: this.uid});
            }
        }
    }

    /**
     * Determine the fill color based on the depth.
     */
    computeFill() {
        const depth = this.ng.transparentNets ? 1 : this.depth;

        if (!this.passthrough) {
            const fill = Math.round(255 * Math.pow(0.8, depth));
            this.shape.style.fill =
                "rgb(" + fill + "," + fill + "," + fill + ")";
            const stroke = Math.round(255 * Math.pow(0.8, depth + 2));
            this.shape.style.stroke =
                "rgb(" + stroke + "," + stroke + "," + stroke + ")";
        }
    }

    /**
     * Remove the item from the graph.
     */
    remove() {
        if (this.expanded) {
            // Collapse the item, but don't tell the server since that would
            // update the server's config
            this.collapse(false);
        }

        // Remove the item from the parent's children list
        if (!this.minimap && this.parent !== null) {
            const index = this.parent.children.indexOf(this);
            this.parent.children.splice(index, 1);
        }

        delete this.ng.svgObjects[this.uid];

        // Update any connections into or out of this item
        const connIn = this.connIn.slice();
        for (let i = 0; i < connIn.length; i++) {
            const conn = connIn[i];
            conn.setPost(conn.findPost());
            conn.redraw();
        }
        const connOut = this.connOut.slice();
        for (let i = 0; i < connOut; i++) {
            const conn = connOut[i];
            conn.setPre(conn.findPre());
            conn.redraw();
        }

        // Remove from the SVG
        this.gItems.removeChild(this.g);
        if (this.depth === 1) {
            this.ng.scaleMiniMap();
        }

        if (!this.minimap) {
            this.miniItem.remove();
        }
    }

    constrainAspect() {
        this.size = this.getDisplayedSize();
    }

    getDisplayedSize() {
        if (this.aspect !== null) {
            const hScale = this.ng.getScaledWidth();
            const vScale = this.ng.getScaledHeight();
            let w = this.getNestedWidth() * hScale;
            let h = this.getNestedHeight() * vScale;

            if (h * this.aspect < w) {
                w = h * this.aspect;
            } else if (w / this.aspect < h) {
                h = w / this.aspect;
            }

            return [w / hScale, h / vScale];
        } else {
            return [this.width, this.height];
        }
    }

    constrainPosition() {
        this.constrainAspect();

        if (this.parent !== null) {
            this.width = Math.min(0.5, this.width);
            this.height = Math.min(0.5, this.height);

            this.x = Math.min(this.x, 1.0 - this.width);
            this.x = Math.max(this.x, this.width);

            this.y = Math.min(this.y, 1.0 - this.height);
            this.y = Math.max(this.y, this.height);
        }
    }

    redrawPosition() {
        const screen = this.getScreenLocation();

        // Update my position
        this.g.setAttribute("transform", "translate(" + screen[0] + ", " +
                            screen[1] + ")");
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

    redrawConnections() {
        // Update any connections into and out of this
        for (let i = 0; i < this.connIn.length; i++) {
            this.connIn[i].redraw();
        }
        for (let i = 0; i < this.connOut.length; i++) {
            this.connOut[i].redraw();
        }
    }

    /**
     * Return the width of the item, taking into account parent widths.
     */
    getNestedWidth() {
        let w = this.width;
        let parent = this.parent;
        while (parent !== null) {
            w *= parent.width * 2;
            parent = parent.parent;
        }
        return w;
    }

    /**
     * Return the height of the item, taking into account parent heights.
     */
    getNestedHeight() {
        let h = this.height;
        let parent = this.parent;
        while (parent !== null) {
            h *= parent.height * 2;
            parent = parent.parent;
        }
        return h;
    }

    redrawSize() {
        let screenW = this.getScreenWidth();
        let screenH = this.getScreenHeight();

        if (this.aspect !== null) {
            if (screenH * this.aspect < screenW) {
                screenW = screenH * this.aspect;
            } else if (screenW / this.aspect < screenH) {
                screenH = screenW / this.aspect;
            }
        }

        // The circle pattern isn't perfectly square, so make its area smaller
        const areaW = this.type === "ens" ? screenW * 0.97 : screenW;
        const areaH = screenH;
        this.area.setAttribute(
            "transform",
            "translate(-" + (areaW / 2) + ", -" + (areaH / 2) + ")");
        this.area.setAttribute("width", areaW);
        this.area.setAttribute("height", areaH);

        if (this.type === "ens") {
            const scale = Math.sqrt(screenH * screenH + screenW * screenW) /
                Math.sqrt(2);
            const r = 17.8; // TODO: Don't hardcode the size of the ensemble
            this.shape.setAttribute(
                "transform", "scale(" + scale / 2 / r + ")");
            this.shape.style.setProperty("stroke-width", 20 / scale);
        } else if (this.passthrough) {
            this.shape.setAttribute("rx", screenW / 2);
            this.shape.setAttribute("ry", screenH / 2);
        } else {
            this.shape.setAttribute(
                "transform",
                "translate(-" + (screenW / 2) + ", -" + (screenH / 2) + ")");
            this.shape.setAttribute("width", screenW);
            this.shape.setAttribute("height", screenH);
            if (this.type === "node") {
                const radius = Math.min(screenW, screenH);
                // TODO: Don't hardcode .1 as the corner radius scale
                this.shape.setAttribute("rx", radius * .1);
                this.shape.setAttribute("ry", radius * .1);
            }
        }

        if (!this.minimap) {
            this.label.setAttribute(
                "transform", "translate(0, " + (screenH / 2) + ")");
        }
    }

    getScreenWidth() {
        if (this.minimap && !this.ng.mmDisplay) {
            return 1;
        }

        if (this.fixedWidth !== null) {
            return this.fixedWidth;
        }

        let w;
        let screenW;
        if (!this.minimap) {
            w = this.ng.width;
            screenW = this.getNestedWidth() * w * this.ng.scale;
        } else {
            w = this.ng.mmWidth;
            screenW = this.getNestedWidth() * w * this.ng.mmScale;
        }

        if (screenW < this.minWidth) {
            screenW = this.minWidth;
        }

        return screenW * 2;
    }

    getScreenHeight() {
        if (this.minimap && !this.ng.mmDisplay) {
            return 1;
        }

        if (this.fixedHeight !== null) {
            return this.fixedHeight;
        }

        let h;
        let screenH;
        if (this.minimap === false) {
            h = this.ng.height;
            screenH = this.getNestedHeight() * h * this.ng.scale;
        } else {
            h = this.ng.mmHeight;
            screenH = this.getNestedHeight() * h * this.ng.mmScale;
        }

        if (screenH < this.minHeight) {
            screenH = this.minHeight;
        }

        return screenH * 2;
    }

    /**
     * Force a redraw of the item.
     */
    redraw() {
        this.redrawPosition();
        this.redrawSize();
        this.redrawChildren();
        this.redrawChildConnections();
        this.redrawConnections();

        if (!this.minimap && this.ng.mmDisplay) {
            this.miniItem.redraw();
        }
    }

    /**
     * Determine the pixel location of the centre of the item.
     */
    getScreenLocation() {
        // FIXME: this should probably use this.ng.getScaledWidth
        // and this.ng.getScaledHeight
        if (this.minimap && !this.ng.mmDisplay) {
            return [1, 1];
        }

        let w;
        let h;
        let offsetX;
        let offsetY;
        if (this.minimap === false) {
            w = this.ng.width * this.ng.scale;
            h = this.ng.height * this.ng.scale;

            offsetX = this.ng.offsetX * w;
            offsetY = this.ng.offsetY * h;
        } else {
            const mmW = this.ng.mmWidth;
            const mmH = this.ng.mmHeight;

            w = mmW * this.ng.mmScale;
            h = mmH * this.ng.mmScale;

            const dispW = (this.ng.mmMaxX - this.ng.mmMinX) * w;
            const dispH = (this.ng.mmMaxY - this.ng.mmMinY) * h;

            offsetX = -this.ng.mmMinX * w + (mmW - dispW) / 2.;
            offsetY = -this.ng.mmMinY * h + (mmH - dispH) / 2.;
        }

        let dx = 0;
        let dy = 0;
        let parent = this.parent;
        while (parent !== null) {
            dx *= parent.width * 2;
            dy *= parent.height * 2;

            dx += (parent.x - parent.width);
            dy += (parent.y - parent.height);
            parent = parent.parent;
        }
        dx *= w;
        dy *= h;

        let ww = w;
        let hh = h;
        if (this.parent !== null) {
            ww *= this.parent.getNestedWidth() * 2;
            hh *= this.parent.getNestedHeight() * 2;
        }

        return [this.x * ww + dx + offsetX,
                this.y * hh + dy + offsetY];
    }

    /**
     * Function for drawing ensemble svg.
     */
    ensembleSvg() {
        const shape = this.ng.createSVGElement("g");
        shape.setAttribute("class", "ensemble");

        const dx = -1.25;
        const dy = 0.25;

        let circle = this.ng.createSVGElement("circle");
        this.setAttributes(
            circle, {"cx": -11.157 + dx, "cy": -7.481 + dy, "r": "4.843"});
        shape.appendChild(circle);
        circle = this.ng.createSVGElement("circle");
        this.setAttributes(
            circle, {"cx": 0.186 + dx, "cy": -0.127 + dy, "r": "4.843"});
        shape.appendChild(circle);
        circle = this.ng.createSVGElement("circle");
        this.setAttributes(
            circle, {"cx": 5.012 + dx, "cy": 12.56 + dy, "r": "4.843"});
        shape.appendChild(circle);
        circle = this.ng.createSVGElement("circle");
        this.setAttributes(
            circle, {"cx": 13.704 + dx, "cy": -0.771 + dy, "r": "4.843"});
        shape.appendChild(circle);
        circle = this.ng.createSVGElement("circle");
        this.setAttributes(
            circle, {"cx": -10.353 + dx, "cy": 8.413 + dy, "r": "4.843"});
        shape.appendChild(circle);
        circle = this.ng.createSVGElement("circle");
        this.setAttributes(
            circle, {"cx": 3.894 + dx, "cy": -13.158 + dy, "r": "4.843"});
        shape.appendChild(circle);

        return shape;
    }

    /**
     * Helper function for setting attributes.
     */
    setAttributes(el, attrs) {
        Object.keys(attrs).forEach(key => {
            el.setAttribute(key, attrs[key]);
        });
    }

    getMinMaxXY() {
        const minX = this.x - this.width;
        const maxX = this.x + this.width;
        const minY = this.y - this.height;
        const maxY = this.y + this.height;
        return [minX, maxX, minY, maxY];
    }
}
