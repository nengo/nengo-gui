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

import { VNode, dom, h  } from "maquette";

import * as menu from "../../menu";
import * as viewport from "../../viewport";
import { NetGraph } from "../netgraph";

export interface NetGraphItemArg {
    ng: NetGraph;

    width: number;
    height: number;

    posX: number;
    posY: number;

    dimensions: number;
    parent: string;

    uid: string;
}

export abstract class NetGraphItem {
    area: VNode;
    aspect;
    childConnections;
    children;
    connIn;
    connOut;
    depth: number;
    dimensions: number;
    fixedHeight;
    fixedWidth;
    g: VNode;
    gItems;
    gNetworks;
    menu;
    minHeight;
    minWidth;
    ng: NetGraph;
    parent: NetGraphItem;
    shape;
    size;
    uid: string;

    protected _height;
    protected _width;
    protected _x;
    protected _y;

    constructor(ngiArg: NetGraphItemArg) {

        this.ng = ngiArg.ng;
        this.uid = ngiArg.uid;

        this._width = ngiArg.width;
        this._height = ngiArg.height;
        this._x = ngiArg.posX;
        this._y = ngiArg.posY;
        this.dimensions = ngiArg.dimensions;

        this.fixedWidth = null;
        this.fixedHeight = null;
        this.gNetworks = this.ng.gNetworks;
        this.gItems = this.ng.gItems;

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
        if (ngiArg.parent === null) {
            this.parent = null;
            this.depth = 1;
        } else {
            this.parent = this.ng.svgObjects[ngiArg.parent];
            this.depth = this.parent.depth + 1;
        }

        // Create the SVG group to hold this item
        this.g = h("g");
        this.gItems.appendChild(this.g);

        this.area = h("rect", {style: "fill:transparent"});

        this.menu = new menu.Menu(this.ng.parent);

        this.computeFill();

        this.g.children.push(this.shape);
        this.g.children.push(this.area);

        this.redraw();
    }

    get height(): number {
        return this._height;
    }

    set height(val: number) {
        this._height = val;
    }

    get width(): number {
        return this._width;
    }

    set width(val: number) {
        this._width = val;
    }

    get x(): number {
        return this._x;
    }

    set x(val: number) {
        this._x = val;
    }

    get y(): number {
        return this._y;
    }

    set y(val: number) {
        this._y = val;
    }

    moveToFront() {
        // TODO: maquette doesn't seem to implement parentNode?
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
        this.g = h("g", {
            transform: "translate(" + screen[0] + ", " + screen[1] + ")",
        });
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
        this.area = h("rect", {
            style: "fill:transparent",
            transform: "translate(-" + (areaW / 2) + ", -" + (areaH / 2) + ")",
            width: areaW,
            height: areaH,
        });
    }

    abstract _getScreenW(): number;

    // TODO: change these to getters and setters?
    getScreenWidth() {
        if (this.fixedWidth !== null) {
            return this.fixedWidth;
        }

        let screenW = this._getScreenW();

        if (screenW < this.minWidth) {
            screenW = this.minWidth;
        }

        return screenW * 2;
    }

    abstract _getScreenH(): number;

    getScreenHeight() {
        if (this.fixedHeight !== null) {
            return this.fixedHeight;
        }

        let screenH = this._getScreenH();

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
    }

    // TODO: rename
    abstract _getPos(): {
        w: number, h: number, offsetX: number, offsetY: number
    };

    /**
     * Determine the pixel location of the centre of the item.
     */
    getScreenLocation() {
        // FIXME: this should probably use this.ng.getScaledWidth
        // and this.ng.getScaledHeight

        let w;
        let h;
        let offsetX;
        let offsetY;

        w, h, offsetX, offsetX = this._getPos();

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
