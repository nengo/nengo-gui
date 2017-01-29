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
import { Shape } from "../../utils";
import { NetGraph } from "../netgraph";
import { NetItem } from "./resizable";


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
    childConnections;
    children;
    connIn;
    connOut;
    depth: number;
    dimensions: number;
    g: SVGElement;
    gItems: SVGElement;
    gNetworks: SVGElement;
    menu;
    minHeight: number;
    minWidth: number;
    ng: NetGraph;
    parent: NetItem;
    shape: SVGElement;
    size: number[];
    uid: string;

    protected _h: number;
    protected _w: number;
    protected _x: number;
    protected _y: number;

    protected _fuck: number;

    constructor(ngiArg: NetGraphItemArg) {

        this.ng = ngiArg.ng;
        this.uid = ngiArg.uid;

        this._w = ngiArg.width;
        this._h = ngiArg.height;
        this._x = ngiArg.posX;
        this._y = ngiArg.posY;
        this.dimensions = ngiArg.dimensions;

        this.gNetworks = this.ng.gNetworks;
        this.gItems = this.ng.gItems;

        // NetGraphConnections leading into and out of this item
        this.connOut = [];
        this.connIn = [];

        // Minimum and maximum drawn size, in pixels
        this.minWidth = 5;
        this.minHeight = 5;

        // Determine the parent NetGraphItem (if any) and the nested depth
        // of this item.
        if (ngiArg.parent === null) {
            this.parent = null;
            this.depth = 1;
        } else {
            this.parent = this.ng.svgObjects.net[ngiArg.parent];
            this.depth = this.parent.depth + 1;
        }

        // Create the SVG group to hold this item's shape and it's label
        this.g = dom.create(h("g")).domNode as SVGElement;
        this.gItems.appendChild(this.g);

        // TODO: find out where to render the menu
        //this.menu = new menu.Menu(this.ng.parent);
    }

    get posX(): number {
        return this._x;
    }

    set posX(val: number) {
        this._x = val;
    }

    get posY(): number {
        return this._y;
    }

    set posY(val: number) {
        this._y = val;
    }

    get height(): number {
        return this._h;
    }

    set height(val: number) {
        this._h = val;
    }

    /**
     * Return the height of the item, taking into account parent heights.
     */
    get nestedHeight() {
        let h = this.height;
        let parent = this.parent;
        while (parent !== null) {
            h *= parent.height * 2;
            parent = parent.parent;
        }
        return h;
    }

    get width(): number {
        return this._w;
    }

    set width(val: number) {
        this._w = val;
    }

    /**
     * Return the width of the item, taking into account parent widths.
     */
    get nestedWidth() {
        let w = this.width;
        let parent = this.parent;
        while (parent !== null) {
            w *= parent.width * 2;
            parent = parent.parent;
        }
        return w;
    }

    get displayedSize() {
        return [this.width, this.height];
    }

    get displayedShape(): Shape {
        const screenW = this.screenWidth;
        const screenH = this.screenHeight;
        return {height: screenH, width: screenW};
    }

    /* 
    Different implementation for normal and mini objects 
    */
    abstract _getScreenW(): number;

    get screenWidth() {
        let screenW = this._getScreenW();

        if (screenW < this.minWidth) {
            screenW = this.minWidth;
        }

        return screenW * 2;
    }

    abstract _getScreenH(): number;

    get screenHeight() {
        let screenH = this._getScreenH();

        if (screenH < this.minHeight) {
            screenH = this.minHeight;
        }

        return screenH * 2;
    }

    // TODO: rename
    abstract _getPos(): {
        w: number, h: number, offsetX: number, offsetY: number
    };

    /**
     * Determine the pixel location of the centre of the item.
     */
    get screenLocation() {
        // FIXME: this should probably use this.ng.getScaledWidth
        // and this.ng.getScaledHeight

        const pos = this._getPos();

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
        dx *= pos.w;
        dy *= pos.h;

        let ww = pos.w;
        let hh = pos.h;
        if (this.parent !== null) {
            ww *= this.parent.nestedWidth * 2;
            hh *= this.parent.nestedHeight * 2;
        }

        return [this.posX * ww + dx + pos.offsetX,
                this.posY * hh + dy + pos.offsetY];
    }

    get minMaxXY() {
        const minX = this.posX - this.width;
        const maxX = this.posX + this.width;
        const minY = this.posY - this.height;
        const maxY = this.posY + this.height;
        return [minX, maxX, minY, maxY];
    }

    abstract _renderShape();

    createModal() {
        this.ng.notify("createModal", {
            connInUids: this.connIn.map(c => {
                return c.uid;
            }),
            connOutUids: this.connOut.map(c => {
                return c.uid;
            }),
            uid: this.uid,
        });
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
        this.size = this.displayedSize;
    }

    constrainPosition() {
        this.constrainAspect();

        if (this.parent !== null) {
            this.width = Math.min(0.5, this.width);
            this.height = Math.min(0.5, this.height);

            this.posX = Math.min(this.posX, 1.0 - this.width);
            this.posX = Math.max(this.posX, this.width);

            this.posY = Math.min(this.posY, 1.0 - this.height);
            this.posY = Math.max(this.posY, this.height);
        }
    }

    redrawPosition() {
        const screen = this.screenLocation;

        this.g.setAttribute(
            "transform",
            "translate(" + screen[0] + ", " + screen[1] + ")"
        );
    }

    redrawConnections() {
        for (let i = 0; i < this.connIn.length; i++) {
            this.connIn[i].redraw();
        }
        for (let i = 0; i < this.connOut.length; i++) {
            this.connOut[i].redraw();
        }
    }

    /**
     * Force a redraw of the item.
     */
    redraw() {
        this.redrawPosition();
        this.redrawConnections();
    }

    /**
     * Helper function for setting attributes.
     */
    setAttributes(el, attrs) {
        Object.keys(attrs).forEach(key => {
            el.setAttribute(key, attrs[key]);
        });
    }
}
