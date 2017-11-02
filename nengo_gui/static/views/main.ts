import { VNode, dom, h } from "maquette";

import "./main.css";

export class MainView {
    root: HTMLElement;

    constructor() {
        const node = h("div.main");

        this.root = dom.create(node).domNode as HTMLElement;
    }
}
