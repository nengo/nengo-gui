/**
 * Keep track of the viewable area of the screen.
 */

import * as $ from "jquery";

import { all_components } from "./components/component";

export default class Viewport {
    height;
    netgraph;
    scale;
    width;
    x;
    y;

    constructor(netgraph) {
        this.netgraph = netgraph;

        this.x = 0;
        this.y = 0;
        this.scale = 1.0;

        this.width = $("#main").width();
        this.height = $("#main").height();
        window.addEventListener("resize", () => {
            this.on_resize(null);
        });
    }

    redraw_all(event) {
        all_components.forEach(c => {
            c.on_resize(
                c.w * this.scale * this.width * 2,
                c.h * this.scale * this.height * 2);
            c.redraw_size();
            c.redraw_pos();
        });
     }

    on_resize(event) {
        const ow = this.width;
        const oh = this.height;

        this.width = $("#main").width();
        this.height = $("#main").height();

        all_components.forEach(c => {
            if (this.netgraph.aspect_resize) {
                c.w = c.w * ow / this.width;
                c.h = c.h * oh / this.height;
            }
            c.on_resize(c.w * this.scale * this.width * 2,
                        c.h * this.scale * this.height * 2);
            c.redraw_size();
            c.redraw_pos();
        });
    }
}
