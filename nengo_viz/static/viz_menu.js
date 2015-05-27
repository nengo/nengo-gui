
/**
 * Create a menu that will appear inside the given div
 */
VIZ.Menu = function(div) {
    this.visible = false;   // whether it's currently visible
    this.div = div;         // the parent div
    this.menu_div = null;       // the div for the menu itself
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
    this.menu_div = document.createElement('div');
    this.menu_div.style.position = 'fixed';
    this.menu_div.style.zIndex = VIZ.next_zindex();
    
    this.menu = document.createElement('ul');
    this.menu.className = 'dropdown-menu';
    this.menu.style.position = 'absolute';
    this.menu.style.display = 'block';
    this.menu.role = 'menu';

    this.menu_div.appendChild(this.menu);
    this.div.appendChild(this.menu_div);

    VIZ.set_transform(this.menu_div, x - 20, y - 20);

    this.actions = {}

    var self = this;
    for (var i in items) {
        var item = items[i];
        var b = document.createElement('li');
        var a = document.createElement('a');
        a.setAttribute('href','#');
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
    VIZ.Menu.visible_menus[this.div] = this;
};


/**
 * Hide this menu
 */
VIZ.Menu.prototype.hide = function () {
    this.div.removeChild(this.menu_div);
    this.visible = false;
    this.menu_div = null;
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
    for(var k in VIZ.Menu.visible_menus) {
        VIZ.Menu.hide_menu_in(k);
    }
}
