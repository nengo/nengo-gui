import { VNode, dom, h } from "maquette";

class VMiddle {
    node: VNode;
    root: HTMLElement;

    constructor() {
        this.node =
            h("div#vmiddle", [
                h("div.droppable#main"),
                h("div#rightpane"),
            ]);

        this.root = dom.create(this.node).domNode as HTMLElement;
    }
}
