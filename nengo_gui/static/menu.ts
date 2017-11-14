/**
 * Create a menu that will appear inside the given div
 *
 * Each element that has a menu makes a call to Menu constructor
 */

import { VNode, dom, h } from "maquette";

import "./menu.css";

import * as utils from "./utils";

export class MenuAction {
    active: () => boolean | null;
    element: HTMLLIElement;

    constructor(element: HTMLLIElement, active: () => boolean = null) {
        this.element = element;
        this.active = active;
    }

    isActive(): boolean {
        if (this.active === null) {
            return true;
        } else {
            return this.active();
        }
    }
}

export class Menu {
    static shown: Menu = null;

    static hideShown = utils.debounce(
        () => {
            if (Menu.shown !== null) {
                document.body.removeChild(Menu.shown.view.root);
                Menu.shown = null;
            }
        },
        50,
        { immediate: true }
    );

    actions: MenuAction[] = [];
    view: MenuView = new MenuView();

    addAction(
        label: string,
        callback: (event: Event) => void,
        active: () => boolean = null
    ) {
        const element = this.view.addAction(label);
        element.addEventListener("click", (event: Event) => {
            callback(event);
            Menu.hideShown();
        });
        element.addEventListener("contextmenu", (event: Event) => {
            event.preventDefault();
            callback(event);
            Menu.hideShown();
        });
        this.actions.push(new MenuAction(element, active));
    }

    addHeader(label: string) {
        this.view.addHeader(label);
    }

    addSeparator() {
        this.view.addSeparator();
    }

    /**
     * Show this menu at the given (x,y) location.
     *
     * Automatically hides any menu with the same parent.
     *
     * Called by a listener from netgraph.js
     */
    show(x: number, y: number) {
        // TODO: have to get toolbar height somehow...
        // For now, we know it's always 35 px
        const toolbarHeight = 35;
        const correctedY = y - toolbarHeight;
        const h = this.view.height;
        const w = this.view.width;

        // TODO: mainH and mainW: get from viewport...?
        const mainH = 600;
        const mainW = 600;

        if (correctedY + h > mainH) {
            y = mainH - h;
        }
        if (x + w > mainW) {
            x = mainW - w;
        }

        Menu.hideShown();
        this.actions.forEach((action, i) => {
            if (action.isActive()) {
                this.view.showAction(action.element);
            } else {
                this.view.hideAction(action.element);
            }
        });
        this.view.show(x, y);
        document.body.appendChild(this.view.root);
        Menu.shown = this;
    }
}

export class MenuView {
    menu: HTMLUListElement;
    root: HTMLDivElement;

    constructor() {
        const node = h("div.menu", [h("ul.dropdown-menu", { role: "menu" })]);
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
        const node = h("li", [h("a.menu-item", { href: "#" }, [label])]);
        const li = dom.create(node).domNode as HTMLLIElement;
        this.menu.appendChild(li);
        return li;
    }

    addHeader(label: string) {
        const node = h("li.dropdown-header", [label]);
        this.menu.appendChild(dom.create(node).domNode);
    }

    addSeparator() {
        const node = h("li.divider", { role: "separator" });
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
