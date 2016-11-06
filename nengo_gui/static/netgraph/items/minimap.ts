import { NetGraphItem } from "../netgraph.ts";

export class MinimapItem extends NetGraphItem {
    constructor(miniItem) {
        super();
        this.gNetworks = this.ng.gNetworksMini;
        this.gItems = this.ng.gItemsMini;
    }
}
