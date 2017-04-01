import * as interact from "interact.js";

import { Menu } from "../menu";
import * as utils from "../utils";

import { ViewPort } from "../viewport";
import { InputDialogView } from "../views/modal";
import { FastWSConnection } from "../websocket";
import { AllComponents } from "./all-components";

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

export abstract class Component {
    static all: Component[] = [];

    div: HTMLDivElement;
    h: number;
    height: number;
    label: HTMLDivElement;
    labelVisible: boolean;
    menu: Menu;
    minHeight: number;
    minWidth: number;
    parent: HTMLElement;
    pendingUpdate;
    uid: string;
    w: number;
    width: number;
    ws;
    viewPort: ViewPort;
    x: number;
    y: number;

    constructor(parent, args) {
        // Create the div for the component and position it
        this.div = document.createElement("div");

        // Prevent interact from messing up cursor
        interact(this.div).styleCursor(true);

        this.x = args.x;
        this.y = args.y;
        this.w = args.width;
        this.h = args.height;
        this.viewPort = args.viewPort;

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

        this.div.onmousedown = () => {
            this.div.style.zIndex = String(utils.nextZindex());
        };

        this.div.ontouchstart = this.div.onmousedown;

        // Allow element to be dragged
        interact(this.div)
            .draggable({
                inertia: true,
                onend: (event) => {
                    this.saveLayout();
                },
                onmove: (event) => {
                    this.x += this.viewPort.fromScreenX(event.dx);
                    this.y += this.viewPort.fromScreenY(event.dy);
                    this.redrawPos();
                },
                onstart: () => {
                    Menu.hideAll();
                },
            });

        // Allow element to be resized
        interact(this.div)
            .resizable({
                edges: { bottom: true, left: true, right: true, top: true },
            })
            .on("resizestart", event => {
                Menu.hideAll();
            })
            .on("resizemove", (event) => {
                const newWidth = event.rect.width;
                const newHeight = event.rect.height;
                const dleft = event.deltaRect.left;
                const dtop = event.deltaRect.top;
                const dright = event.deltaRect.right;
                const dbottom = event.deltaRect.bottom;

                this.x += this.viewPort.fromScreenX((dleft + dright) / 2);
                this.y += this.viewPort.fromScreenY((dtop + dbottom) / 2);

                this.w = this.viewPort.unscaleWidth(newWidth);
                this.h = this.viewPort.unscaleHeight(newHeight);

                this.onResize(newWidth, newHeight);
                this.redrawSize();
                this.redrawPos();
            })
            .on("resizeend", (event) => {
                this.saveLayout();
            });

        // Open a WebSocket to the server
        this.uid = args.uid;
        if (this.uid !== undefined) {
            this.ws = new FastWSConnection(this.uid);
            this.ws.onmessage = (message) => {
                this.onMessage(message);
            };
        }

        // Flag whether there is a scheduled update that hasn't happened yet
        this.pendingUpdate = false;

        this.menu = new Menu(this.parent);
        this.addMenuItems();
        interact(this.div)
            .on("hold", (event) => { // Change to 'tap' for right click
                if (event.button === 0) {
                    if (Menu.anyVisible()) {
                        Menu.hideAll();
                    } else {
                        this.menu.show(event.clientX, event.clientY);
                    }
                    event.stopPropagation();
                }
            })
            .on("tap", (event) => { // Get rid of menus when clicking off
                if (event.button === 0) {
                    if (Menu.anyVisible()) {
                        Menu.hideAll();
                    }
                }
            });
        window.addEventListener("contextmenu", (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (Menu.anyVisible()) {
                Menu.hideAll();
            } else {
                this.menu.show(event.clientX, event.clientY);
            }
            return false;
        });

        Component.all.push(this);
    }

    addKeyHandler(dialog: InputDialogView) {
        dialog.input.addEventListener("keydown", (event) => {
            // Allow the enter key to submit
            if (event.which === 13) {
                event.preventDefault();
                dialog.ok.click();
            // Allow tabs to enter in default values
            } else if ((event.keyCode || event.which) === 9) {
                const values = dialog.input.placeholder.split(",");
                const curVal = dialog.input.value;
                let curIndex = curVal.split(",").length - 1;
                let pre = " "; // Space and possible comma before value
                let post = ","; // Possible comma after value

                // Only do special things if there are more values to enter
                if (curIndex < values.length) {
                    // Compute the correct current index
                    if (curVal.length > 0) {
                        if (curVal.trim().slice(-1) !== ",") {
                            curIndex += 1;
                            pre = ", "; // Need a comma as well between values
                        }
                    } else {
                        pre = ""; // No space for the first value
                    }
                    if (curIndex === values.length - 1) {
                        post = "";
                    }
                    // If the last character is a comma or there are no
                    // characters, fill in the next default value
                    if (curVal.length === 0 ||
                            curVal.trim().slice(-1) === ",") {
                        dialog.input.value += (
                            pre + values[curIndex].trim() + post);
                        event.preventDefault();
                    } else if (curIndex < values.length) {
                        dialog.input.value += ", ";
                        event.preventDefault();
                    }
                }
            }
        });
    }

    /**
     * Method to be called when Component is resized.
     */
    abstract onResize(width, height);

    /**
     * Method to be called when Component received a WebSocket message.
     */
    abstract onMessage(event);

    addMenuItems() {
        this.menu.addAction("Hide label", () => {
            this.hideLabel(null);
            this.saveLayout();
        }, () => this.labelVisible)
        this.menu.addAction("Show label", () => {
            this.showLabel(null);
            this.saveLayout();
        }, () => !this.labelVisible);
        this.menu.addAction("Remove", () => { this.remove(); });
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
        this.allComponents.remove(this);
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
    abstract update(event);

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
            height: this.h,
            labelVisible: this.labelVisible,
            width: this.w,
            x: this.x,
            y: this.y,
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
            this.viewPort.scaleWidth(this.w),
            this.viewPort.scaleHeight(this.h),
        );

        if (config.labelVisible === true) {
            this.showLabel(null);
        } else {
            this.hideLabel(null);
        }
    }

    redrawSize() {
        this.width = this.viewPort.scaleWidth(this.w);
        this.height = this.viewPort.scaleHeight(this.h);
        this.div.style.width = String(this.width);
        this.div.style.height = String(this.height);
    }

    redrawPos() {
        const x = this.viewPort.toScreenX(this.x - this.w);
        const y = this.viewPort.toScreenY(this.y - this.h);
        // utils.setTransform(this.div, x, y);
    }
}
