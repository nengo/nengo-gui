var all_components = require('./components/component').all_components;

var Viewport = function(netgraph) {
    this.netgraph = netgraph;

    this.x = 0;
    this.y = 0;
    this.scale = 1.0;

    this.w = $("#main").width();
    this.h = $("#main").height();
    var self = this;
    window.addEventListener("resize", function() {self.on_resize();});
};

Viewport.prototype.redraw_all = function(event) {
    for (var i in all_components) {
        var c = all_components[i];
        c.on_resize(
            c.w * this.scale * this.w * 2, c.h * this.scale * this.h * 2);
        c.redraw_size();
        c.redraw_pos();
    }
};

Viewport.prototype.on_resize = function(event) {
    var ow = this.w;
    var oh = this.h;

    this.w = $("#main").width();
    this.h = $("#main").height();

    for (var i in all_components) {
        var c = all_components[i];
        if (this.netgraph.aspect_resize) {
            c.w = c.w * ow/this.w;
            c.h = c.h * oh/this.h;
        }
        c.on_resize(c.w * this.scale * this.w * 2,
            c.h * this.scale * this.h * 2);
        c.redraw_size();
        c.redraw_pos();
    }
};

module.exports = Viewport;
