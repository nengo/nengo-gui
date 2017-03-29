/**
 * Create a menu that will appear inside the given div
 *
 * Each element that has a menu makes a call to Menu constructor
 */

import { MenuView } from "./views/menu";

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
    static allShown: Menu[] = [];

    actions: MenuAction[] = [];
    parent: HTMLElement;
    view: MenuView = new MenuView();

    static anyVisible(parent: HTMLElement | null = null) {
        if (parent === null) {
            return Menu.allShown.length;
        } else {
            return Menu.allShown.reduce((sum, menu) => {
                return sum + (menu.parent === parent ? 1 : 0);
            }, 0);
        }
    }

    static hideAll(parent: HTMLElement | null = null) {
        Menu.allShown.forEach(menu => {
            if (parent === null || menu.parent === parent) {
                menu.hide();
            }
        });
    }

    constructor(parent: HTMLElement) {
        this.parent = parent;
    }

    get hidden(): boolean {
        return this.view.root.parentNode === this.parent;
    }

    addAction(
        label: string,
        callback: (event: Event) => void,
        active: () => boolean = null,
    ) {
        const element = this.view.addAction(label);
        element.addEventListener("click", (event: Event) => {
            callback(event);
            this.hide();
        })
        element.addEventListener("contextmenu", (event: Event) => {
            event.preventDefault();
            callback(event);
            this.hide();
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

        Menu.hideAll(this.parent);
        this.actions.forEach((action, i) => {
            if (action.isActive()) {
                this.view.showAction(action.element);
            } else {
                this.view.hideAction(action.element);
            }
        });
        this.view.show(x, y);
        this.parent.appendChild(this.view.root);
        Menu.allShown.push(this);
    }

    /**
     * Hide this menu.
     */
    hide() {
        this.parent.removeChild(this.view.root);
        // Remove from allShown list
        Menu.allShown.splice(Menu.allShown.indexOf(this), 1);
    }
}
