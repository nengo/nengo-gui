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
    var ow = this.w;
    var oh = this.h;

    this.w = $("#main").width();
    this.h = $("#main").height();

    for (var i in Nengo.Component.components) {
        var c = Nengo.Component.components[i];
        if (Nengo.netgraph.aspect_resize) {
            c.w = c.w * ow/this.w;
            c.h = c.h * oh/this.h;
        }
        c.on_resize(c.w * this.scale * this.w * 2,
            c.h * this.scale * this.h * 2);
        c.redraw_size();
        c.redraw_pos();
    }
}
