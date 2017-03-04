/**
 * Network diagram individual item (node).
 */

import { NetGraph } from "../netgraph";
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

    ng: NetGraph;
    view: NetGraphItemView;
    uid: string;

    constructor(ngiArg: NetGraphItemArg) {

        this.ng = ngiArg.ng;
        this.uid = ngiArg.uid;

        // NetGraphConnections leading into and out of this item
        this.connOut = [];
        this.connIn = [];

        this.view = new NetGraphItemView(ngiArg);
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
        if (this.view.depth === 1) {
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
