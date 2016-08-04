import { all_components } from "./components/component";

export default class Viewport{

constructor(netgraph) {
    this.netgraph = netgraph;

    this.x = 0;
    this.y = 0;
    this.scale = 1.0;

    this.w = $("#main").width();
    this.h = $("#main").height();
    var self = this;
    window.addEventListener("resize", function() {self.on_resize();});
};

redraw_all(event) {
    for (var i in all_components) {
        var c = all_components[i];
        c.on_resize(
            c.w * this.scale * this.w * 2, c.h * this.scale * this.h * 2);
        c.redraw_size();
        c.redraw_pos();
    }
};

on_resize(event) {
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

}
