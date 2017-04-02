import { h  } from "maquette";

import { domCreateSvg, Shape } from "../../../utils";
import { NetGraph } from "../../netgraph";
import { NetGraphItemArg } from "../item";
import { NetItem } from "../resizable";

export class NetGraphItemView {
    alias: string;
    depth: number;
    gItems: SVGElement;
    ng: NetGraph;

    // TODO: protect these later
    g: SVGGElement;
    shape: SVGElement;

    minHeight: number;
    minWidth: number;

    parent: NetItem;

    _h: number;
    _w: number;
    _x: number;
    _y: number;

    constructor(ngiArg: NetGraphItemArg) {
        // mostly just takes care of the g when things change
        this.ng = ngiArg.ng;

        this._x = ngiArg.posX;
        this._y = ngiArg.posY;
        this._w = ngiArg.width;
        this._h = ngiArg.height;
        this.gItems = this.ng.view.gItems;

        // Minimum drawn size, in pixels
        this.minWidth = 5;
        this.minHeight = 5;

        // temporarily hardcoded
        this.alias = "node";

        // Create the SVG group to hold this item's shape and it's label
        this.g = domCreateSvg(h(`g.${this.alias}`)) as SVGGElement;
        this.gItems.appendChild(this.g);

        // Determine the parent NetGraphItem (if any) and the nested depth
        // of this item.
        if (ngiArg.parent === null) {
            this.parent = null;
            this.depth = 1;
        } else {
            this.parent = this.ng.svgObjects.net[ngiArg.parent];
            this.depth = this.parent.view.depth + 1;
        }
    }

    get x(): number {
        console.assert(!isNaN(this._x));
        return this._x;
    }

    get y(): number {
        console.assert(!isNaN(this._y));
        return this._y;
    }

    get height(): number {
        return this._h;
    }

    /**
     * Return the height of the item, taking into account parent heights.
     */
    get nestedHeight() {
        let h = this.height;
        let parent = this.parent;
        while (parent !== null) {
            h *= parent.view.height * 2;
            parent = parent.view.parent;
        }
        return h;
    }

    get width(): number {
        return this._w;
    }

    /**
     * Return the width of the item, taking into account parent widths.
     */
    get nestedWidth() {
        let w = this.width;
        let parent = this.parent;
        while (parent !== null) {
            w *= parent.view.width * 2;
            parent = parent.view.parent;
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

    // TODO: make abstract once minimap is implemented
    // abstract _getNetGraphDims(): {
    //     w: number, h: number, offsetX: number, offsetY: number
    // };

    /**
     * Determine the pixel location of the centre of the item.
     */
    get screenLocation() {

        const ngDims = this._getNetGraphDims();

        let parentShiftX = 0;
        let parentShiftY = 0;
        let parent = this.parent;
        while (parent !== null) {
            parentShiftX = ((parentShiftX * parent.view.width * 2)
                                + (parent.view.x - parent.view.width));
            parentShiftY = ((parentShiftY * parent.view.height * 2)
                                + (parent.view.y - parent.view.height));
            parent = parent.view.parent;
        }
        parentShiftX *= ngDims.w;
        parentShiftY *= ngDims.h;

        let wScale = ngDims.w;
        let hScale = ngDims.h;
        if (this.parent !== null) {
            wScale *= this.parent.view.nestedWidth * 2;
            hScale *= this.parent.view.nestedHeight * 2;
        }

        return [this.x * wScale + parentShiftX + ngDims.offsetX,
                this.y * hScale + parentShiftY + ngDims.offsetY];
    }

    /* 
        Different implementation for normal and mini objects 
    */
    // abstract _getScreenW(): number;

    // temporary accessors because we're not concerning ourselves
    // with the minimap yet
    _getScreenW() {
        return this.ng.view.width * this.ng.scale;
    }

    _getScreenH() {
        return this.ng.view.height * this.ng.scale;
    }

    _getNetGraphDims() {
        const w = this.ng.scaledWidth;
        const h = this.ng.scaledHeight;

        const offsetX = this.ng.offsetX * w;
        const offsetY = this.ng.offsetY * h;

        console.assert(!isNaN(offsetX));
        console.assert(!isNaN(offsetY));

        return {w, h, offsetX, offsetY};
    }

    get screenWidth() {
        let screenW = this._getScreenW();

        if (screenW < this.minWidth) {
            screenW = this.minWidth;
        }

        return screenW * 2;
    }

    // abstract _getScreenH(): number;

    get screenHeight() {
        let screenH = this._getScreenH();

        if (screenH < this.minHeight) {
            screenH = this.minHeight;
        }

        return screenH * 2;
    }

    get minMaxXY() {
        const minX = this.x - this.width;
        const maxX = this.x + this.width;
        const minY = this.y - this.height;
        const maxY = this.y + this.height;
        return [minX, maxX, minY, maxY];
    }

    // abstract _renderShape();

    redrawPosition() {
        const screen = this.screenLocation;

        this.g.setAttribute(
            "transform",
            `translate(${screen[0]}, ${screen[1]})`,
        );
    }

    remove() {
        this.gItems.removeChild(this.g);
    }

    /**
     * Helper function for setting attributes.
     */
    setAttributes(el, attrs) {
        Object.keys(attrs).forEach((key) => {
            el.setAttribute(key, attrs[key]);
        });
    }
}
