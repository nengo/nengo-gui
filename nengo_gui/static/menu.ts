/**
 * Create a menu that will appear inside the given div
 *
 * Each element that has a menu makes a call to Menu constructor
 */

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
    var menu = visible_menus[div];
    if (menu !== undefined) {
        menu.hide();
    }
};

export function hide_any() {
    for (var k in visible_menus) {
        hide_menu_in(k);
    }
};

export class Menu {

    constructor(div) {
        this.visible = false; // Whether it's currently visible
        this.div = div; // The parent div
        this.menu_div = null; // The div for the menu itself
        this.actions = null; // The current action list for the menu
    };

    /**
     * Show this menu at the given (x,y) location.
     *
     * Automatically hides any menu that's in the same div
     * Called by a listener from netgraph.js
     */
    show(x, y, items) {
        hide_menu_in(this.div);

        if (items.length == 0) {
            return;
        }

        // TODO: move this to the constructor
        this.menu_div = document.createElement('div');
        this.menu_div.style.position = 'fixed';
        this.menu_div.style.left = x;
        this.menu_div.style.top = y;
        this.menu_div.style.zIndex = utils.next_zindex();

        this.menu = document.createElement('ul');
        this.menu.className = 'dropdown-menu';
        this.menu.style.position = 'absolute';
        this.menu.style.display = 'block';
        this.menu.role = 'menu';

        this.menu_div.appendChild(this.menu);
        this.div.appendChild(this.menu_div);

        this.actions = {};

        var self = this;
        for (var i in items) {
            var item = items[i];
            var b = document.createElement('li');
            var a = document.createElement('a');
            a.setAttribute('href', '#');
            a.className = 'menu-item';
            a.innerHTML = item[0];
            a.func = item[1];
            this.actions[a] = item[1];
            $(a).click(function(e) {
                e.target.func();
                self.hide();
            })
                .on('contextmenu', function(e) {
                    e.preventDefault();
                    e.target.func();
                    self.hide();
                });
            b.appendChild(a);
            this.menu.appendChild(b);
        }
        this.visible = true;
        this.check_overflow(x, y);
        visible_menus[this.div] = this;
    };

    /**
     * Hide this menu.
     */
    hide() {
        this.div.removeChild(this.menu_div);
        this.visible = false;

        this.menu_div = null;
        delete visible_menus[this.div];
    };

    visible_any() {
        return visible_menus[this.div] !== undefined;
    };

    check_overflow(x, y) {
        var corrected_y = y - $(toolbar.toolbar).height();
        var h = $(this.menu).outerHeight();
        var w = $(this.menu).outerWidth();

        var main_h = $('#main').height();
        var main_w = $('#main').width();

        if (corrected_y + h > main_h) {
            this.menu_div.style.top = y - h;
        }

        if (x + w > main_w) {
            this.menu_div.style.left = main_w - w;
        }
    };

}
