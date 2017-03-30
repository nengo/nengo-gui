import * as interact from "interact.js";
import { h } from "maquette";

import { hideAllMenus, Menu, MenuItem } from "../../menu";
import { domCreateSvg, Shape } from "../../utils";
import { NetGraphItem, NetGraphItemArg } from "./item";
import { MinimapItem } from "./minimap";

export interface InteractableItemArg {
    miniItem: MinimapItem;
    label: string;
}

export abstract class InteractableItem extends NetGraphItem {
    alias: string;
    minimap;
    miniItem;
    uid: string;
    _label: SVGTextElement;
    _labelBelow: boolean;
    menu: Menu;

    constructor(ngiArg: NetGraphItemArg, interArg: InteractableItemArg,
                dimensions) {
        super(ngiArg);

        const labelNode = h("text", {innerHTML: interArg.label, transform: ""});
        this._label = domCreateSvg(labelNode) as SVGTextElement;
        this.miniItem = interArg.miniItem;
        this.view.g.appendChild(this._label);

        this.menu = new Menu(this.ng.view.root);

        if (ngiArg.parent !== null) {
            this.view.parent.children.push(this);
        }

        interact(this.view.g)
            .draggable({
                onend: (event) => {
                    this.constrainPosition();
                    this.ng.notify("pos", {
                        uid: this.uid, x: this.x, y: this.y});

                    this.redraw();
                },
                onmove: (event) => {
                    const scale = this.scales;
                    this.x += event.dx / scale.hor;
                    this.y += event.dy / scale.vert;
                    this.redraw();

                    if (this.view.depth === 1) {
                        this.ng.scaleMiniMap();
                    }
                },
                onstart: () => {
                    hideAllMenus();
                },
            })
            // Determine when to pull up the menu
            .on("hold", (event) => {
                // Change to "tap" for right click
                if (event.button === 0) {
                    if (this.menu.visibleAny()) {
                        hideAllMenus();
                    } else {
                        this.menu.show(event.clientX,
                                        event.clientY,
                                        this.generateMenu());
                    }
                    event.stopPropagation();
                }
            })
            .on("tap", (event) => {
                // Get rid of menus when clicking off
                if (event.button === 0) {
                    if (this.menu.visibleAny()) {
                        hideAllMenus();
                    }
                }
            })
            .on("doubletap", (event) => {
                // Get rid of menus when clicking off
                if (event.button === 0) {
                    if (this.menu.visibleAny()) {
                        hideAllMenus();
                    }
                }
            })
            .on("contextmenu", (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (this.menu.visibleAny()) {
                    hideAllMenus();
                } else {
                    this.menu.show(
                        event.clientX, event.clientY, this.generateMenu());
                }
            });
    }

    generateMenu(): MenuItem[] {
        const items: MenuItem[] = [];
        items.push({html: "Auto-layout", callback: () => {
            this.requestFeedforwardLayout();
        }});
        return items;
    }

    get scales(){
        let hScale = this.ng.scaledWidth;
        let vScale = this.ng.scaledHeight;
        let parent = this.view.parent;
        while (parent !== null) {
            hScale *= parent.width * 2;
            vScale *= parent.height * 2;
            parent = parent.view.parent;
        }
        return {hor: hScale, vert: vScale};
    }

    set height(val: number) {
        this.view._h = val;
        // this.miniItem.height = val;
    }

    set width(val: number) {
        this.view._w = val;
        // this.miniItem.width = val;
    }

    set x(val: number) {
        this.view._x = val;
        // this.miniItem.x = val;
    }

    set y(val: number) {
        this.view._y = val;
        // this.miniItem.y = val;
    }

    requestFeedforwardLayout() {
        this.ng.notify("feedforwardLayout", {uid: this.uid});
    }

    remove() {
        // Remove the item from the parent's children list
        if (this.view.parent !== null) {
            const index = this.view.parent.children.indexOf(this);
            this.view.parent.children.splice(index, 1);
        }

        super.remove();

        // this.miniItem.remove();
    }

    redrawSize(): Shape {
        const screenD = this.view.displayedShape;
        this._label.setAttribute(
         "transform",
         "translate(0, " + (screenD.height / 2) + ")",
        );
        return screenD;
    }

    // _getScreenW() {
    //     return this.view.nestedWidth * this.ng.width * this.ng.scale;
    // }

    // _getScreenH() {
    //     return this.view.nestedHeight * this.ng.height * this.ng.scale;
    // }

    redraw() {
        super.redraw();
        this.redrawSize();
        // if (this.ng.mmDisplay) {
        //     this.miniItem.redraw();
        // }
    }

    set label(label) {
        this._label.setAttribute("innerHTML", label);
    }

    // TODO: what is the expected functionality of this thing?
    set labelBelow(flag) {
        if (flag && !this._labelBelow) {
            const screenH = this.view.screenHeight;
            this.label.setAttribute(
                "transform",
                "translate(0, " + (screenH / 2) + ")",
            );
        } else if (!flag && this._labelBelow) {
            this.label.setAttribute(
                "transform",
                "",
            );
        }
    }

    constrainPosition() {
        if (this.view.parent !== null) {
            this.width = Math.min(0.5, this.width);
            this.height = Math.min(0.5, this.height);

            this.x = Math.min(this.x, 1.0 - this.width);
            this.x = Math.max(this.x, this.width);

            this.y = Math.min(this.y, 1.0 - this.height);
            this.y = Math.max(this.y, this.height);
        }
    }

    // TODO: rename to createComponent?
    createGraph(graphType, args=null) { // tslint:disable-line
        // TODO: get nested implemented this
        // const w = this.nestedWidth;
        // const h = this.nestedHeight;
        const pos = this.view.screenLocation;
        const w = this.view.width;
        const h = this.view.height;

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

    constructor(ngiArg: NetGraphItemArg, interArg: InteractableItemArg,
                dimensions) {
        super(ngiArg, interArg, dimensions);
        this.alias = "passthrough";

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

    // this is probably going to need to be refactored
    _renderShape() {
        const shape = h("ellipse.passthrough");
        this.view.shape = domCreateSvg(shape);
        this.view.g.appendChild(this.view.shape);
        this.redraw();
    }

    redrawSize() {
        const screenD = super.redrawSize();

        this.view.shape.setAttribute("rx", String(screenD.width / 2));
        this.view.shape.setAttribute("ry", String(screenD.height / 2));

        return screenD;
    }
}
