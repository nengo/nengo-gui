import * as $ from "jquery";

import * as allComponents from "./components/all-components";

let scale = 1.0;
let x = 0;
let y = 0;
let height = 0;
let width = 0;
let $main;
let netgraph;

export function setNetgraph(newNetgraph) {
    netgraph = newNetgraph;
    $main = $("#main");

    width = $main.width();
    height = $main.height();
    window.addEventListener("resize", onresize);
}

export function setPosition(newX, newY) {
    x = newX;
    y = newY;
    redraw();
}

export function setScale(newScale) {
    scale = newScale;
    redraw();
}

export function redraw() {
    allComponents.onresize(scale * width * 2, height * scale * 2);
    allComponents.redraw();
}

export function onresize() {
    const oldWidth = width;
    const oldHeight = height;

    width = $main.width();
    height = $main.height();

    if (netgraph.aspect_resize) {
        allComponents.rescale(oldWidth / width, oldHeight / height);
    }

    redraw();
}

export function fromScreenX(screenX): number {
    return screenX / (width * scale);
}

export function shiftX(componentX): number {
    return componentX + x;
}

export function toScreenX(componentX): number {
    return shiftX(componentX) *  width * scale;
}

export function fromScreenY(screenY): number {
    return screenY / (height * scale);
}

export function shiftY(componentY): number {
    return componentY + y;
}

export function toScreenY(componentY): number {
    return shiftY(componentY) *  height * scale;
}

export function scaleWidth(componentWidth): number {
    return componentWidth * width * scale * 2;
}

export function scaleHeight(componentHeight): number {
    return componentHeight * height * scale * 2;
}

export function unscaleWidth(screenWidth): number {
    return screenWidth / (width * scale) / 2;
}

export function unscaleHeight(screenHeight): number {
    return screenHeight / (height * scale) / 2;
}
