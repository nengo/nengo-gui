/**
 * Create a menu that will appear inside the given div
 *
 * Each element that has a menu makes a call to Menu constructor
 */

import * as $ from "jquery";

import "./menu.css";
import * as utils from "./utils";

export class Menu {
    static all: Menu[];

    actions;
    menu;
    menuDiv;
    parent: HTMLElement;
    visible;

    constructor(parent: HTMLElement) {
        this.visible = false; // Whether it's currently visible
        this.parent = parent; // The parent div
        this.menuDiv = null; // The div for the menu itself
        this.actions = {}; // The current action list for the menu
    }

    static hideAll(parent: HTMLElement | null = null) {
        Menu.all.forEach(menu => {
            if (parent === null || menu.parent === parent) {
                menu.hide();
            }
        });
    }

    /**
     * Show this menu at the given (x,y) location.
     *
     * Automatically hides any menu with the same parent.
     *
     * Called by a listener from netgraph.js
     */
    show(x, y, items) {
        Menu.hideAll(this.parent);

        if (items.length === 0) {
            return;
        }

        // TODO: move this to the constructor
        this.menuDiv = document.createElement("div");
        this.menuDiv.style.position = "fixed";
        this.menuDiv.style.left = x;
        this.menuDiv.style.top = y;
        this.menuDiv.style.zIndex = utils.nextZindex();

        this.menu = document.createElement("ul");
        this.menu.className = "dropdown-menu";
        this.menu.style.position = "absolute";
        this.menu.style.display = "block";
        this.menu.role = "menu";

        this.menuDiv.appendChild(this.menu);
        this.div.appendChild(this.menuDiv);

        this.actions = {};

        items.forEach(item => {
            // TODO: Fix this stuff up, not sure things are bound correctly
            const [html, func] = item;
            const b = document.createElement("li");
            const a = document.createElement("a");
            a.setAttribute("href", "#");
            a.className = "menu-item";
            $(a).append(html);

            this.actions[html] = func;
            $(a).click(e => {
                func();
                this.hide();
            }).on("contextmenu", e => {
                e.preventDefault();
                func();
                this.hide();
            });
            b.appendChild(a);
            this.menu.appendChild(b);
        });
        this.visible = true;
        this.checkOverflow(x, y);
        visibleMenus[this.div] = this;
    }

    /**
     * Hide this menu.
     */
    hide() {
        this.div.removeChild(this.menuDiv);
        this.visible = false;

        this.menuDiv = null;
        delete visibleMenus[this.div];
    }

    visibleAny() {
        return visibleMenus[this.div] !== undefined;
    }

    checkOverflow(x, y) {
        const correctedY = y - $("#top_toolbar_div").height();
        const h = $(this.menu).outerHeight();
        const w = $(this.menu).outerWidth();

        const mainH = $("#main").height();
        const mainW = $("#main").width();

        if (correctedY + h > mainH) {
            this.menuDiv.style.top = y - h;
        }

        if (x + w > mainW) {
            this.menuDiv.style.left = mainW - w;
        }
    }
}
