Nengo.Viewport = function() {
    this.x = 0;
    this.y = 0;
    this.scale = 1.0;

    this.w = $("#main").width();
    this.h = $("#main").height();
    var self = this;
    window.addEventListener("resize", function() {self.on_resize();});
}

Nengo.Viewport.prototype.redraw_all = function(event) {
    for (var i in Nengo.Component.components) {
        var c = Nengo.Component.components[i];
        c.on_resize(c.w * this.scale * this.w * 2, c.h * this.scale * this.h * 2);
        c.redraw_size();
        c.redraw_pos();
    }
};

Nengo.Viewport.prototype.on_resize = function(event) {
    this.w = $("#main").width();
    this.h = $("#main").height();
    this.redraw_all();
}
