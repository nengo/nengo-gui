import * as interact from "interact.js";
import * as $ from "jquery";

import * as menu from "../menu";
import * as utils from "../utils";
import * as viewport from "../viewport";
import * as allComponents from "./all-components";

/**
 * Base class for interactive visualization
 * Components (value/raster/XY plots, sliders, etc...) will inherit from
 * this class.
 *
 * @constructor
 * @param {DOMElement} parent - the element to add this component to
 * @param {Object} args - A set of constructor arguments, including:
 * @param {float} args.x - the left side of the component (in pixels)
 * @param {float} args.y - the top of the component (in pixels)
 * @param {float} args.width - the width of the component (in pixels)
 * @param {float} args.height - the height of the component (in pixels)
 * @param {boolean} args.label_visible - whether the label should be shown
 * @param {int} args.id - the id of the server-side component to connect to
 *
 * Component is inherited by specific component
 * class prototypes (ie. Slider, Value).
 *
 */
export class Component {
    div;
    h;
    height;
    label;
    labelVisible;
    menu;
    minHeight;
    minWidth;
    parent;
    pendingUpdate;
    uid;
    w;
    width;
    ws;
    x;
    y;

    constructor(parent, args) {
        // Create the div for the component and position it
        this.div = document.createElement("div");

        // Prevent interact from messing up cursor
        interact(this.div).styleCursor(true);

        this.x = args.x;
        this.y = args.y;
        this.w = args.width;
        this.h = args.height;

        this.redrawSize();
        this.redrawPos();

        this.div.style.position = "absolute";
        this.div.classList.add("graph");
        parent.appendChild(this.div);
        this.parent = parent;

        this.label = document.createElement("div");
        this.label.classList.add("label", "unselectable");
        // utils.safeSetText(
        //     this.label, args.label.replace("<", "&lt;").replace(">", "&gt;"));
        this.label.style.position = "fixed";
        this.label.style.width = args.width;
        this.label.style.height = "2em";
        this.labelVisible = true;
        this.div.appendChild(this.label);
        if (args.labelVisible === false) {
            this.hideLabel(null);
        }

        this.minWidth = 2;
        this.minHeight = 2;

        // Move element to be drawn on top when clicked on

        this.div.onmousedown = function() {
            this.style.zIndex = utils.nextZindex();
        };

        this.div.ontouchstart = this.div.onmousedown;

        // Allow element to be dragged
        interact(this.div)
            .draggable({
                inertia: true,
                onend: event => {
                    this.saveLayout();
                },
                onmove: event => {
                    this.x += viewport.fromScreenX(event.dx);
                    this.y += viewport.fromScreenY(event.dy);
                    this.redrawPos();
                },
                onstart: () => {
                    menu.hideAny();
                },
            });

        // Allow element to be resized
        interact(this.div)
            .resizable({
                edges: { bottom: true, left: true, right: true, top: true },
            })
            .on("resizestart", event => {
                menu.hideAny();
            })
            .on("resizemove", event => {
                const newWidth = event.rect.width;
                const newHeight = event.rect.height;
                const dleft = event.deltaRect.left;
                const dtop = event.deltaRect.top;
                const dright = event.deltaRect.right;
                const dbottom = event.deltaRect.bottom;

                this.x += viewport.fromScreenX((dleft + dright) / 2);
                this.y += viewport.fromScreenY((dtop + dbottom) / 2);

                this.w = viewport.unscaleWidth(newWidth);
                this.h = viewport.unscaleHeight(newHeight);

                this.onResize(newWidth, newHeight);
                this.redrawSize();
                this.redrawPos();
            })
            .on("resizeend", event => {
                this.saveLayout();
            });

        // Open a WebSocket to the server
        this.uid = args.uid;
        if (this.uid !== undefined) {
            this.ws = utils.createWebsocket(this.uid);
            this.ws.onmessage = message => {
                this.onMessage(message);
            };
        }

        // Flag whether there is a scheduled update that hasn't happened yet
        this.pendingUpdate = false;

        this.menu = new menu.Menu(this.parent);
        interact(this.div)
            .on("hold", event => { // Change to 'tap' for right click
                if (event.button === 0) {
                    if (this.menu.visibleAny()) {
                        menu.hideAny();
                    } else {
                        this.menu.show(event.clientX, event.clientY,
                                       this.generateMenu());
                    }
                    event.stopPropagation();
                }
            })
            .on("tap", event => { // Get rid of menus when clicking off
                if (event.button === 0) {
                    if (this.menu.visibleAny()) {
                        menu.hideAny();
                    }
                }
            });
        $(this.div).bind("contextmenu", event => {
            event.preventDefault();
            event.stopPropagation();
            if (this.menu.visibleAny()) {
                menu.hideAny();
            } else {
                this.menu.show(
                    event.clientX, event.clientY, this.generateMenu());
            }
            return false;
        });

        allComponents.add(this);
    }

    /**
     * Method to be called when Component is resized.
     */
    onResize(width, height) {
        // Subclasses should implement this.
    }

    /**
     * Method to be called when Component received a WebSocket message.
     */
    onMessage(event) {
        // Subclasses should implement this.
    }

    generateMenu() {
        const items = [];
        if (this.labelVisible) {
            items.push(["Hide label", () => {
                this.hideLabel(null);
                this.saveLayout();
            }]);
        } else {
            items.push(["Show label", () => {
                this.showLabel(null);
                this.saveLayout();
            }]);
        }
        items.push(["Remove", () => {
            this.remove();
        }]);
        return items;
    }

    remove(undoFlag=false, notifyServer=true) { // tslint:disable-line
        if (notifyServer) {
            if (undoFlag === true) {
                this.ws.send("removeUndo");
            } else {
                this.ws.send("remove");
            }
        }
        this.parent.removeChild(this.div);
        allComponents.remove(this);
    }

    /**
     * Schedule update() to be called in the near future.
     *
     * If update() is already scheduled, then do nothing. This is meant to limit
     * how fast update() is called in the case that we are changing the data
     * faster than whatever processing is needed in update().
     */
    scheduleUpdate() {
        if (this.pendingUpdate === false) {
            this.pendingUpdate = true;
            window.setTimeout(() => {
                this.pendingUpdate = false;
                this.update(null);
            }, 10);
        }
    }

    /**
     * Do any visual updates needed due to changes in the underlying data.
     */
    update(event) {
        // Subclasses should implement this.
    }

    hideLabel(event) {
        if (this.labelVisible) {
            this.label.style.display = "none";
            this.labelVisible = false;
        }
    }

    showLabel(event) {
        if (!this.labelVisible) {
            this.label.style.display = "inline";
            this.labelVisible = true;
        }
    }

    layoutInfo() {
        return {
            "height": this.h,
            "labelVisible": this.labelVisible,
            "width": this.w,
            "x": this.x,
            "y": this.y,
        };
    }

    saveLayout() {
        const info = this.layoutInfo();
        this.ws.send("config:" + JSON.stringify(info));
    }

    updateLayout(config) {
        this.w = config.width;
        this.h = config.height;
        this.x = config.x;
        this.y = config.y;

        this.redrawSize();
        this.redrawPos();
        this.onResize(
            viewport.scaleWidth(this.w), viewport.scaleHeight(this.h));

        if (config.labelVisible === true) {
            this.showLabel(null);
        } else {
            this.hideLabel(null);
        }
    }

    redrawSize() {
        this.width = viewport.scaleWidth(this.w);
        this.height = viewport.scaleHeight(this.h);
        this.div.style.width = this.width;
        this.div.style.height = this.height;
    }

    redrawPos() {
        const x = viewport.toScreenX(this.x - this.w);
        const y = viewport.toScreenY(this.y - this.h);
        // utils.setTransform(this.div, x, y);
    }
}
