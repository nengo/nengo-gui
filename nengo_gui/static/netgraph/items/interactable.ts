import { dom, h, VNode } from "maquette";

import { NetGraphItem } from "./item.ts";
import { MenuItem } from "../../menu.ts";

abstract class InteractableItem extends NetGraphItem {
    minimap;
    miniItem;
    uid;
    gNetworks;
    gItems;

    constructor(uid, minimap, miniItem) {
        super();
        // TODO: WTF, do abstract classes not pass on their properities?
        // this has got to be an error
        this.gNetworks = this.ng.gNetworksMini;
        this.gItems = this.ng.gItemsMini;

        const labelText = h("text");
        this.label = labelText;
        this.label.innerHTML = label;
        this.uid = uid;
        this.minimap = minimap;
        this.miniItem = miniItem;
        g.appendChild(this.label);

        this.uid = uid;
        interact(g).draggable({
            onend: event => {
                const item = this.ng.svgObjects[uid];
                item.constrainPosition();
                this.ng.notify({
                    act: "pos", uid: uid, x: item.x, y: item.y,
                });

                item.redraw();
            },
            onmove: event => {
                const item = this.ng.svgObjects[uid];
                let w = this.ng.getScaledWidth();
                let h = this.ng.getScaledHeight();
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
                menu.hideAny();
                this.moveToFront();
            },
        });
        // Determine when to pull up the menu
        interact(this.g)
            .on("hold", event => {
                // Change to "tap" for right click
                if (event.button === 0) {
                    if (this.menu.visibleAny()) {
                        menu.hideAny();
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
                        menu.hideAny();
                    }
                }
            })
            .on("doubletap", event => {
                // Get rid of menus when clicking off
                if (event.button === 0) {
                    if (this.menu.visibleAny()) {
                        menu.hideAny();
                    } else if (this.type === "net") {
                        if (this.expanded) {
                            this.collapse(true);
                        } else {
                            this.expand();
                        }
                    }
                }
            });
        this.g.addEventListener("contextmenu", event => {
            event.preventDefault();
            event.stopPropagation();
            if (this.menu.visibleAny()) {
                menu.hideAny();
            } else {
                this.menu.show(
                    event.clientX, event.clientY, this.generateMenu());
            }
        });
    }

    // TODO: How do I make sure this is implemented by subclasses?
    abstract generateMenu(): MenuItem[];

    reshapeSize() {
        super();
        this.label.setAttribute(
                "transform", "translate(0, " + (screenH / 2) + ")");
    }
}

export class PassthroughItem extends InteractableItem {
    constructor() {
        super();
        this.shape = h("ellipse");
        // TODO: WTF can this be avoided?
        if (this.minimap === false) {
            this.fixedWidth = 10;
            this.fixedHeight = 10;
        } else {
            this.fixedWidth = 3;
            this.fixedHeight = 3;
        }
        this.g.classList.add("passthrough");
    }

    reshapeSize() {
        super();
        this.shape.setAttribute("rx", screenW / 2);
        this.shape.setAttribute("ry", screenH / 2);
    }
}
