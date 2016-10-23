import { VNode, dom, h } from "maquette";

class VMiddle {
    node: VNode;
    root: HTMLElement;

    constructor() {
        this.node =
            h("div#loading", {styles: {
                "z-index": "100000002",
                "position": "absolute",
                "top": "0",
                "right": "0",
                "bottom": "0",
                "left": "0",
                "background": "#ffffff",
            }});

        this.root = dom.create(this.node).domNode as HTMLElement;
    }
}
