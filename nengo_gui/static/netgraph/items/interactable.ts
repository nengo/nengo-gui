import * as interact from "interact.js";
import { VNode, dom, h  } from "maquette";

import { MenuItem } from "../../menu";
import { Shape } from "../../utils";
import { NetGraphItem, NetGraphItemArg } from "./item";
import { MinimapItem } from "./minimap";

export interface InteractableItemArg {
    miniItem: MinimapItem;
    label: string;
}

export abstract class InteractableItem extends NetGraphItem {
    minimap;
    miniItem;
    uid: string;
    gNetworks;
    gItems;
    label: SVGTextElement;
    labelBelow: boolean;

    constructor(ngiArg: NetGraphItemArg, interArg: InteractableItemArg) {
        super(ngiArg);
        this.gNetworks = this.ng.gNetworksMini;
        this.gItems = this.ng.gItemsMini;

        const labelNode = h("text", {innerHTML: interArg.label, transform: ""});
        this.label = dom.create(labelNode).domNode as SVGTextElement;
        this.miniItem = interArg.miniItem;
        this.g.appendChild(this.label);


        if (ngiArg.parent !== null) {
            this.parent.children.push(this);
        }

        interact(this.g).draggable({
            onend: event => {
                const item = this.ng.svgObjects[this.uid];
                item.constrainPosition();
                this.ng.notify("pos", {uid: this.uid, x: item.x, y: item.y});

                item.redraw();
            },
            onmove: event => {
                const item = this.ng.svgObjects[this.uid];
                let w = this.ng.scaledWidth;
                let h = this.ng.scaledHeight;
                let parent = item.parent;
                while (parent !== null) {
                    w *= parent.width * 2;
                    h *= parent.height * 2;
                    parent = parent.parent;
                }
                item.x += event.dx / w;
                item.y += event.dy / h;
                item.redraw();

                if (this.depth === 1) {
                    this.ng.scaleMiniMap();
                }
            },
            onstart: () => {
                this.menu.hideAny();
            },
        });
        // Determine when to pull up the menu
        interact(this.g)
            .on("hold", event => {
                // Change to "tap" for right click
                if (event.button === 0) {
                    if (this.menu.visibleAny()) {
                        this.menu.hideAny();
                    } else {
                        this.menu.show(event.clientX,
                                       event.clientY,
                                       this.generateMenu());
                    }
                    event.stopPropagation();
                }
            })
            .on("tap", event => {
                // Get rid of menus when clicking off
                if (event.button === 0) {
                    if (this.menu.visibleAny()) {
                        this.menu.hideAny();
                    }
                }
            })
            .on("doubletap", event => {
                // Get rid of menus when clicking off
                if (event.button === 0) {
                    if (this.menu.visibleAny()) {
                        this.menu.hideAny();
                    }
                }
            });
        // TODO: attach menu events in a sane manner
        // this.g = h("g", {contextmenu: event => {
        //     event.preventDefault();
        //     event.stopPropagation();
        //     if (this.menu.visibleAny()) {
        //         this.menu.hideAny();
        //     } else {
        //         this.menu.show(
        //             event.clientX, event.clientY, this.generateMenu());
        //     }
        // }});

        // TODO: redrawSize here?
    }

    // TODO: How do I make sure this is implemented by subclasses?
    abstract generateMenu(): MenuItem[];

    // TODO: there doesn't seem to be a way to `super` call a setter
    set height(val: number) {
        this._h = val;
        this.miniItem.height = val;
    }

    set width(val: number) {
        this._w = val;
        this.miniItem.width = val;
    }

    set x(val: number) {
        this._x = val;
        this.miniItem.x = val;
    }

    set y(val: number) {
        this._y = val;
        this.miniItem.y = val;
    }

    remove() {
        // Remove the item from the parent's children list
        if (this.parent !== null) {
            const index = this.parent.children.indexOf(this);
            this.parent.children.splice(index, 1);
        }

        super.remove();

        // this.miniItem.remove();
    }

    redrawSize(): Shape {
        const screenD = this.displayedShape;
        this.label.setAttribute(
         "transform",
         "translate(0, " + (screenD.height / 2) + ")",
        );
        return screenD;
    }

    _getScreenW() {
        return this.nestedWidth * this.ng.width * this.ng.scale;
    }

    _getScreenH() {
        return this.nestedHeight * this.ng.height * this.ng.scale;
    }

    redraw() {
        super.redraw();
        this.redrawSize();
        // if (this.ng.mmDisplay) {
        //     this.miniItem.redraw();
        // }
    }

    _getPos() {
        const w = this.ng.width * this.ng.scale;
        const h = this.ng.height * this.ng.scale;

        const offsetX = this.ng.offsetX * w;
        const offsetY = this.ng.offsetY * h;

        return {w, h, offsetX, offsetY};
    }

    setLabel(label) {
        this.label.setAttribute("innerHTML", label);
    }

    // TODO: what is the expected functionality of this thing?
    setLabelBelow(flag) {
        if (flag && !this.labelBelow) {
            const screenH = this.screenHeight;
            this.label.setAttribute(
                "transform",
                "translate(0, " + (screenH / 2) + ")",
            );
        } else if (!flag && this.labelBelow) {
            this.label.setAttribute(
                "transform",
                "",
            );
        }
    }

        // TODO: rename to createComponent?
    createGraph(graphType, args=null) { // tslint:disable-line
        const w = this.nestedWidth;
        const h = this.nestedHeight;
        const pos = this.screenLocation;

        const info: any = {
            height: this.ng.viewPort.fromScreenY(100),
            type: graphType,
            uid: this.uid,
            width: this.ng.viewPort.fromScreenX(100),
            x: this.ng.viewPort.fromScreenX(pos[0])
                - this.ng.viewPort.shiftX(w),
            y: this.ng.viewPort.fromScreenY(pos[1])
                - this.ng.viewPort.shiftY(h),
        };

        if (args !== null) {
            info.args = args;
        }

        if (info.type === "Slider") {
            info.width /= 2;
        }

        this.ng.notify("createGraph", info);
    }
}

export class PassthroughItem extends InteractableItem {
    fixedHeight: number;
    fixedWidth: number;

    constructor(ngiArg: NetGraphItemArg, interArg: InteractableItemArg) {
        super(ngiArg, interArg);

        // TODO: WTF can this be avoided?
        // I have to make a sepcific minimap subclass for this...
        // or something better?
        // if (this.minimap === false) {
        //     this.fixedWidth = 10;
        //     this.fixedHeight = 10;
        // } else {
        //     this.fixedWidth = 3;
        //     this.fixedHeight = 3;
        // }
        this.fixedWidth = 3;
        this.fixedHeight = 3;
    }

    _getScreenWidth() {
        return this.fixedWidth;
    }

    _getScreenHeight() {
        return this.fixedHeight;
    }

    // TODO: What type of menu is this thing supposed to generate?
    generateMenu() {
        return [];
    }

    // this is probably going to need to be refactored
    _renderShape() {
        const shape = h("ellipse.passthrough");
        this.shape = dom.create(shape).domNode as SVGElement;
        this.g.appendChild(this.shape);
        this.redraw();
    }

    redrawSize() {
        const screenD = super.redrawSize();

        this.shape.setAttribute("rx", String(screenD.width / 2));
        this.shape.setAttribute("ry", String(screenD.height / 2));

        return screenD;
    }
}
