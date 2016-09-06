/**
 * Create a menu that will appear inside the given div
 *
 * Each element that has a menu makes a call to Menu constructor
 */

import * as $ from "jquery";

import "./menu.css";
import * as utils from "./utils";

/**
 * Dictionary of currently shown menus.
 *
 * The key is the div the menu is in.
 */
export var visible_menus = {};

/**
 * Hide any menu that is displayed in the given div
 */
export function hide_menu_in(div) {
    const menu = visible_menus[div];
    if (menu !== undefined) {
        menu.hide();
    }
}

export function hide_any() {
    Object.keys(visible_menus).forEach(k => {
        hide_menu_in(k);
    });
}

export class Menu {
    actions;
    div;
    menu;
    menu_div;
    visible;

    constructor(div) {
        this.visible = false; // Whether it's currently visible
        this.div = div; // The parent div
        this.menu_div = null; // The div for the menu itself
        this.actions = {}; // The current action list for the menu
    }

    /**
     * Show this menu at the given (x,y) location.
     *
     * Automatically hides any menu that's in the same div
     * Called by a listener from netgraph.js
     */
    show(x, y, items) {
        hide_menu_in(this.div);

        if (items.length === 0) {
            return;
        }

        // TODO: move this to the constructor
        this.menu_div = document.createElement("div");
        this.menu_div.style.position = "fixed";
        this.menu_div.style.left = x;
        this.menu_div.style.top = y;
        this.menu_div.style.zIndex = utils.next_zindex();

        this.menu = document.createElement("ul");
        this.menu.className = "dropdown-menu";
        this.menu.style.position = "absolute";
        this.menu.style.display = "block";
        this.menu.role = "menu";

        this.menu_div.appendChild(this.menu);
        this.div.appendChild(this.menu_div);

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
        this.check_overflow(x, y);
        visible_menus[this.div] = this;
    }

    /**
     * Hide this menu.
     */
    hide() {
        this.div.removeChild(this.menu_div);
        this.visible = false;

        this.menu_div = null;
        delete visible_menus[this.div];
    }

    visible_any() {
        return visible_menus[this.div] !== undefined;
    }

    check_overflow(x, y) {
        const corrected_y = y - $("#top_toolbar_div").height();
        const h = $(this.menu).outerHeight();
        const w = $(this.menu).outerWidth();

        const main_h = $("#main").height();
        const main_w = $("#main").width();

        if (corrected_y + h > main_h) {
            this.menu_div.style.top = y - h;
        }

        if (x + w > main_w) {
            this.menu_div.style.left = main_w - w;
        }
    }
}
