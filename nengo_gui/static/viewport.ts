import * as $ from "jquery";

import * as all_components from "./components/all_components";

let scale = 1.0;
let x = 0;
let y = 0;
let height = 0;
let width = 0;
let $main;
let netgraph;

class Viewport {

}

export function set_netgraph(new_netgraph) {
    netgraph = new_netgraph;
    $main = $("#main");

    width = $main.width();
    height = $main.height();
    window.addEventListener("resize", on_resize);
}

export function set_position(new_x, new_y) {
    x = new_x;
    y = new_y;
    redraw();
}

export function set_scale(new_scale) {
    scale = new_scale;
    redraw();
}

export function redraw() {
    all_components.on_resize(scale * width * 2, height * scale * 2);
    all_components.redraw();
}

export function on_resize() {
    const old_width = width;
    const old_height = height;

    width = $main.width();
    height = $main.height();

    if (netgraph.aspect_resize) {
        all_components.rescale(old_width / width, old_height / height);
    }

    redraw();
}

export function from_screen_x(screen_x): number {
    return screen_x / (width * scale);
}

export function shift_x(component_x): number {
    return component_x + x;
}

export function to_screen_x(component_x): number {
    return shift_x(component_x) *  width * scale;
}

export function from_screen_y(screen_y): number {
    return screen_y / (height * scale);
}

export function shift_y(component_y): number {
    return component_y + y;
}

export function to_screen_y(component_y): number {
    return shift_y(component_y) *  height * scale;
}

export function scale_width(component_width): number {
    return component_width * width * scale * 2;
}

export function scale_height(component_height): number {
    return component_height * height * scale * 2;
}

export function unscale_width(screen_width): number {
    return screen_width / (width * scale) / 2;
}

export function unscale_height(screen_height): number {
    return screen_height / (height * scale) / 2;
}
