
/**
 * Create a menu that will appear inside the given div
 */
VIZ.Menu = function(div) {
    this.visible = false;   // whether it's currently visible
    this.div = div;         // the parent div
    this.menu = null;       // the div for the menu itself
    this.actions = null;    // the current action list for the menu
};


/**
 * Dictionary of currently shown menus
 * The key is the div the menu is in
 */
VIZ.Menu.visible_menus = {};


/**
 * Show this menu at the given (x,y) location
 * Automatically hides any menu that's in the same div
 */
VIZ.Menu.prototype.show = function (x, y, items) {
    VIZ.Menu.hide_menu_in(this.div);

    if (items.length == 0) {
        return;
    }
    
    // TODO: move this to the constructor
    this.menu = document.createElement('div');
    this.menu.className = 'btn-group-vertical';
    this.menu.role = 'group';
    this.menu.style.position = 'fixed';

    /** because VIZ.Components increase their zIndex every time they are
     * clicked on, we need the menu's zIndex to be very large
     * TODO: change this to be one more than the highest existing zIndex
     */
    this.menu.style.zIndex = "999999999";
    this.div.appendChild(this.menu);

    VIZ.set_transform(this.menu, x - 20, y - 20);

    this.actions = {}

    var self = this;
    for (var i in items) {
        var item = items[i];
        var b = document.createElement('button');
        b.className = 'btn btn-default';
        b.innerHTML = item[0];
        b.func = item[1];
        this.actions[b] = item[1];
        $(b).click(function(e) { e.target.func(); self.hide();});
        this.menu.appendChild(b);
    }

    this.visible = true;
    VIZ.Menu.visible_menus[this.div] = this;
};


/**
 * Hide this menu
 */
VIZ.Menu.prototype.hide = function () {
    this.div.removeChild(this.menu);
    this.visible = false;
    this.menu = null;
    delete VIZ.Menu.visible_menus[this.div];
};


/**
 * Hide any menu that is displayed in the given div
 */
VIZ.Menu.hide_menu_in = function (div) {
    var menu = VIZ.Menu.visible_menus[div];
    if (menu !== undefined) {
        menu.hide();
    }
}

VIZ.Menu.prototype.visible_any = function () {
    return VIZ.Menu.visible_menus[this.div] !== undefined;
}

VIZ.Menu.prototype.hide_any = function () {
    VIZ.Menu.hide_menu_in(this.div);
}
