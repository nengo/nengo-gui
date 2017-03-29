import { VNode, dom, h } from "maquette";

import "./menu.css";
import * as utils from "../utils";

export class MenuView {
    menu: HTMLUListElement;
    root: HTMLDivElement;

    constructor() {
        const node =
            h("div.menu", [
                h("ul.dropdown-menu", {role: "menu"}),
            ]);
        this.root = dom.create(node).domNode as HTMLDivElement;
        this.menu = this.root.firstChild as HTMLUListElement;
    }

    get height(): number {
        return this.root.offsetHeight;
    }

    get width(): number {
        return this.root.offsetWidth;
    }

    addAction(label: string): HTMLLIElement {
        const node = h("li", [h("a.menu-item", {href: "#"}, [label])]);
        const li = dom.create(node).domNode as HTMLLIElement;
        this.menu.appendChild(li);
        return li;
    }

    addHeader(label: string) {
        const node = h("li.dropdown-header", [label]);
        this.menu.appendChild(dom.create(node).domNode);
    }

    addSeparator() {
        const node = h("li.divider", {role: "separator"});
        this.menu.appendChild(dom.create(node).domNode);
    }

    hideAction(element: HTMLLIElement) {
        element.style.display = "none";
    }

    showAction(element: HTMLLIElement) {
        element.style.display = null;
    }

    show(x: number, y: number) {
        this.root.style.left = x + "px";
        this.root.style.top = y + "px";
        this.root.style.zIndex = String(utils.nextZindex());
    }
}
