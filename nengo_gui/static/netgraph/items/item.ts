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
import { dom, h, VNode } from "maquette";

import * as menu from "../../menu";
import * as viewport from "../../viewport";

// TODO: still have to remove all the `if minimap` stuff

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
    ng;
    parent;
    shape;
    size;
    uid;
    private _height;
    private _width;
    private _x;
    private _y;

    // TODO: If it turns out that we keep passing these arguments,
    // it means we should make a defined class for them
    constructor(ng, defaultOutput, width, height, posX, posY,
                dimensions, html, parent, miniItem) {

        this.ng = ng;

        this.defaultOutput = defaultOutput;
        this._width = width;
        this._height = height;
        this._x = posX;
        this._y = posY;
        this.dimensions = dimensions;
        this.htmlNode = html;

        this.fixedWidth = null;
        this.fixedHeight = null;
        this.gNetworks = this.ng.gNetworks;
        this.gItems = this.ng.gItems;
        this.miniItem = miniItem;

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

        // Determine the parent NetGraphItem (if any) and the nested depth
        // of this item.
        if (parent === null) {
            this.parent = null;
            this.depth = 1;
        } else {
            this.parent = this.ng.svgObjects[parent];
            this.depth = this.parent.depth + 1;
            if (!minimap) {
                this.parent.children.push(this);
            }
        }

        // Create the SVG group to hold this item
        const g = h("g");
        this.g = g;
        this.gItems.appendChild(g);
        g.classList.add(this.type);

        this.area = h("rect");
        this.area.style.fill = "transparent";

        this.menu = new menu.Menu(this.ng.parent);

        this.computeFill();

        g.appendChild(this.shape);
        g.appendChild(this.area);

        this.redraw();
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

    createGraph(type, args=null) { // tslint:disable-line
        const w = this.getNestedWidth();
        const h = this.getNestedHeight();
        const pos = this.getScreenLocation();

        const info: any = {
            act: "createGraph",
            height: viewport.fromScreenY(100),
            type: type,
            uid: this.uid,
            width: viewport.fromScreenX(100),
            x: viewport.fromScreenX(pos[0]) - viewport.shiftX(w),
            y: viewport.fromScreenY(pos[1]) - viewport.shiftY(h),
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
            act: "createModal",
            connInUids: this.connIn.map(c => {
                return c.uid;
            }),
            connOutUids: this.connOut.map(c => {
                return c.uid;
            }),
            uid: this.uid,
        });
    }

    requestFeedforwardLayout() {
        this.attached.forEach(conn => {
            conn.send("netgraph.feedforwardLayout");
        });
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
                // TODO: Does this need a uid?
                // probably?
                this.attached.forEach(conn => {
                    conn.send("netgraph.autoExpand");
                });
            } else {
                this.attached.forEach(conn => {
                    conn.send("netgraph.expand");
                });
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
    // TODO: can you turn this into css so it's calculated automatically?
    computeFill() {
        const depth = this.ng.transparentNets ? 1 : this.depth;
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
        const areaW = screenW;
        const areaH = screenH;
        this.area.setAttribute(
            "transform",
            "translate(-" + (areaW / 2) + ", -" + (areaH / 2) + ")");
        this.area.setAttribute("width", areaW);
        this.area.setAttribute("height", areaH);
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
