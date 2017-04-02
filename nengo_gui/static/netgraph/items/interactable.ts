import * as interact from "interact.js";
import { h } from "maquette";

import { Menu } from "../../menu";
import { domCreateSvg, Shape } from "../../utils";
import { NetGraphItem, NetGraphItemArg } from "./item";
import { MinimapItem } from "./minimap";
import { InteractableView, PassthroughView } from "./views/interactable";

export interface InteractableItemArg {
    miniItem: MinimapItem;
    label: string;
}

export abstract class InteractableItem extends NetGraphItem {
    alias: string;
    minimap;
    miniItem;
    uid: string;
    _labelBelow: boolean;
    menu: Menu;

    view: InteractableView;

    constructor(ngiArg: NetGraphItemArg, interArg: InteractableItemArg,
                dimensions: number) {
        super(ngiArg);

        this.miniItem = interArg.miniItem;

        this.menu = new Menu(this.ng.view.root);

        if (ngiArg.parent !== null) {
            this.view.parent.children.push(this);
        }

        interact(this.view.g)
            .draggable({
                onend: (event) => {
                    this.view.constrainPosition();
                    this.ng.notify("pos", {
                        uid: this.uid, x: this.view.x, y: this.view.y});

                    this.redraw();
                },
                onmove: (event) => {
                    this.view.move(event);
                    this.redraw();

                    if (this.view.depth === 1) {
                        this.ng.scaleMiniMap();
                    }
                },
                onstart: () => {
                    Menu.hideAll();
                },
            })
            // Determine when to pull up the menu
            .on("hold", (event) => {
                // Change to "tap" for right click
                if (event.button === 0) {
                    if (Menu.anyVisible()) {
                        Menu.hideAll();
                    } else {
                        this.menu.show(event.clientX, event.clientY);
                    }
                    event.stopPropagation();
                }
            })
            .on("tap", (event) => {
                // Get rid of menus when clicking off
                if (event.button === 0) {
                    if (Menu.anyVisible()) {
                        Menu.hideAll();
                    }
                }
            })
            .on("doubletap", (event) => {
                // Get rid of menus when clicking off
                if (event.button === 0) {
                    if (Menu.anyVisible()) {
                        Menu.hideAll();
                    }
                }
            })
            .on("contextmenu", (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (Menu.anyVisible()) {
                    Menu.hideAll();
                } else {
                    this.menu.show(event.clientX, event.clientY);
                }
            });
    }

    addMenuItems() {
        this.menu.addAction("Auto-layout", () => {
            this.requestFeedforwardLayout();
        });
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

    redraw() {
        super.redraw();
        this.view.redrawSize();
        // if (this.ng.mmDisplay) {
        //     this.miniItem.redraw();
        // }
    }

    set labelBelow(flag) {
        if (flag && !this._labelBelow) {
            const screenH = this.view.screenHeight;
            this.view.moveLabel(screenH / 2);
        } else if (!flag && this._labelBelow) {
            this.view.moveLabel(0);
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

        // TODO: implement an interfact for this and rename it
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

        // TODO: change this to an actual function call
        this.ng.notify("createGraph", info);
    }
}

export class PassthroughItem extends InteractableItem {
    fixedHeight: number;
    fixedWidth: number;

    constructor(ngiArg: NetGraphItemArg, interArg: InteractableItemArg,
                dimensions: number, createView: boolean) {
        super(ngiArg, interArg, dimensions);
        this.alias = "passthrough";
        this.view = new PassthroughView(ngiArg, interArg);
    }
}
