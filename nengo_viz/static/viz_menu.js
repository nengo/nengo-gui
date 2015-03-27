
VIZ.Menu = function(div, item) {
    this.visible = false;
    this.div = div;
    this.menu = null;
    this.actions = null;
};

VIZ.Menu.visible_menus = {};

VIZ.Menu.prototype.show = function (x, y, items) {
    VIZ.Menu.hide_menu_in(this.div);

    this.menu = document.createElement('div');
    this.menu.className = 'btn-group-vertical';
    this.menu.role = 'group';
    this.menu.style.position = 'fixed';
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

VIZ.Menu.prototype.hide = function () {
    this.div.removeChild(this.menu);
    this.visible = false;
    this.menu = null;
    delete VIZ.Menu.visible_menus[this.div];
};

VIZ.Menu.hide_menu_in = function (div) {
    var menu = VIZ.Menu.visible_menus[div];
    if (menu !== undefined) {
        menu.hide();
    }
}
