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

// import * as menu from "../../menu";
import { NetGraph } from "../netgraph";
import { NetItem } from "./resizable";
import { NetGraphItemView } from "./views/item";

export interface NetGraphItemArg {
    ng: NetGraph;

    width: number;
    height: number;

    posX: number;
    posY: number;

    parent: string;

    uid: string;
}

// TODO: make abstract once basics are completed
export class NetGraphItem {
    childConnections;
    children;
    connIn;
    connOut;
    depth: number;

    menu;
    ng: NetGraph;
    parent: NetItem;
    view: NetGraphItemView;
    uid: string;

    constructor(ngiArg: NetGraphItemArg) {

        this.ng = ngiArg.ng;
        this.uid = ngiArg.uid;

        // NetGraphConnections leading into and out of this item
        this.connOut = [];
        this.connIn = [];

        // Determine the parent NetGraphItem (if any) and the nested depth
        // of this item.
        if (ngiArg.parent === null) {
            this.parent = null;
            this.depth = 1;
        } else {
            // TODO: I think this is wrong
            this.parent = this.ng.svgObjects.net[ngiArg.parent];
            this.depth = this.parent.depth + 1;
        }

        this.view = new NetGraphItemView(ngiArg);

        // TODO: find out where to render the menu
        //this.menu = new menu.Menu(this.ng.parent);
    }

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
        this.view.remove();
        if (this.depth === 1) {
            this.ng.scaleMiniMap();
        }
    }

    redrawPosition() {
        this.view.redrawPosition();
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
}
