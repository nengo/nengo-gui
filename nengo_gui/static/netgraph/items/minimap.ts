import NetGraphItem as NetGraphItem from "../netgraph.ts";

export class MinimapItem extends NetGraphItem {
    constructor() {
        super();
        this.gNetworks = this.ng.gNetworksMini;
        this.gItems = this.ng.gItemsMini;
    }
}
