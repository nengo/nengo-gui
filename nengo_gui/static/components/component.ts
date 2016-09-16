import * as interact from "interact.js";
import * as $ from "jquery";

import * as menu from "../menu";
import * as utils from "../utils";
import * as viewport from "../viewport";
import * as all_components from "./all_components";

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
    label_visible;
    menu;
    min_height;
    min_width;
    parent;
    pending_update;
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

        this.redraw_size();
        this.redraw_pos();

        this.div.style.position = "absolute";
        this.div.classList.add("graph");
        parent.appendChild(this.div);
        this.parent = parent;

        this.label = document.createElement("div");
        this.label.classList.add("label", "unselectable");
        utils.safe_set_text(
            this.label, args.label.replace("<", "&lt;").replace(">", "&gt;"));
        this.label.style.position = "fixed";
        this.label.style.width = args.width;
        this.label.style.height = "2em";
        this.label_visible = true;
        this.div.appendChild(this.label);
        if (args.label_visible === false) {
            this.hide_label(null);
        }

        this.min_width = 2;
        this.min_height = 2;

        // Move element to be drawn on top when clicked on

        this.div.onmousedown = function() {
            this.style.zIndex = utils.next_zindex();
        };

        this.div.ontouchstart = this.div.onmousedown;

        // Allow element to be dragged
        interact(this.div)
            .draggable({
                inertia: true,
                onend: event => {
                    this.save_layout();
                },
                onmove: event => {
                    this.x += viewport.from_screen_x(event.dx);
                    this.y += viewport.from_screen_y(event.dy);
                    this.redraw_pos();
                },
                onstart: () => {
                    menu.hide_any();
                },
            });

        // Allow element to be resized
        interact(this.div)
            .resizable({
                edges: { bottom: true, left: true, right: true, top: true },
            })
            .on("resizestart", event => {
                menu.hide_any();
            })
            .on("resizemove", event => {
                const new_width = event.rect.width;
                const new_height = event.rect.height;
                const dleft = event.deltaRect.left;
                const dtop = event.deltaRect.top;
                const dright = event.deltaRect.right;
                const dbottom = event.deltaRect.bottom;

                this.x += viewport.from_screen_x((dleft + dright) / 2);
                this.y += viewport.from_screen_y((dtop + dbottom) / 2);

                this.w = viewport.unscale_width(new_width);
                this.h = viewport.unscale_height(new_height);

                this.on_resize(new_width, new_height);
                this.redraw_size();
                this.redraw_pos();
            })
            .on("resizeend", event => {
                this.save_layout();
            });

        // Open a WebSocket to the server
        this.uid = args.uid;
        if (this.uid !== undefined) {
            this.ws = utils.create_websocket(this.uid);
            this.ws.onmessage = message => {
                this.on_message(message);
            };
        }

        // Flag whether there is a scheduled update that hasn't happened yet
        this.pending_update = false;

        this.menu = new menu.Menu(this.parent);
        interact(this.div)
            .on("hold", event => { // Change to 'tap' for right click
                if (event.button === 0) {
                    if (this.menu.visible_any()) {
                        menu.hide_any();
                    } else {
                        this.menu.show(event.clientX, event.clientY,
                                       this.generate_menu());
                    }
                    event.stopPropagation();
                }
            })
            .on("tap", event => { // Get rid of menus when clicking off
                if (event.button === 0) {
                    if (this.menu.visible_any()) {
                        menu.hide_any();
                    }
                }
            });
        $(this.div).bind("contextmenu", event => {
            event.preventDefault();
            event.stopPropagation();
            if (this.menu.visible_any()) {
                menu.hide_any();
            } else {
                this.menu.show(
                    event.clientX, event.clientY, this.generate_menu());
            }
            return false;
        });

        all_components.add(this);
    }

    /**
     * Method to be called when Component is resized.
     */
    on_resize(width, height) {
        // Subclasses should implement this.
    }

    /**
     * Method to be called when Component received a WebSocket message.
     */
    on_message(event) {
        // Subclasses should implement this.
    }

    generate_menu() {
        const items = [];
        if (this.label_visible) {
            items.push(["Hide label", () => {
                this.hide_label(null);
                this.save_layout();
            }]);
        } else {
            items.push(["Show label", () => {
                this.show_label(null);
                this.save_layout();
            }]);
        }
        items.push(["Remove", () => {
            this.remove();
        }]);
        return items;
    }

    remove(undo_flag=false, notify_server=true) { // tslint:disable-line
        if (notify_server) {
            if (undo_flag === true) {
                this.ws.send("remove_undo");
            } else {
                this.ws.send("remove");
            }
        }
        this.parent.removeChild(this.div);
        all_components.remove(this);
    }

    /**
     * Schedule update() to be called in the near future.
     *
     * If update() is already scheduled, then do nothing. This is meant to limit
     * how fast update() is called in the case that we are changing the data
     * faster than whatever processing is needed in update().
     */
    schedule_update() {
        if (this.pending_update === false) {
            this.pending_update = true;
            window.setTimeout(() => {
                this.pending_update = false;
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

    hide_label(event) {
        if (this.label_visible) {
            this.label.style.display = "none";
            this.label_visible = false;
        }
    }

    show_label(event) {
        if (!this.label_visible) {
            this.label.style.display = "inline";
            this.label_visible = true;
        }
    }

    layout_info() {
        return {
            "height": this.h,
            "label_visible": this.label_visible,
            "width": this.w,
            "x": this.x,
            "y": this.y,
        };
    }

    save_layout() {
        const info = this.layout_info();
        this.ws.send("config:" + JSON.stringify(info));
    }

    update_layout(config) {
        this.w = config.width;
        this.h = config.height;
        this.x = config.x;
        this.y = config.y;

        this.redraw_size();
        this.redraw_pos();
        this.on_resize(
            viewport.scale_width(this.w), viewport.scale_height(this.h));

        if (config.label_visible === true) {
            this.show_label(null);
        } else {
            this.hide_label(null);
        }
    }

    redraw_size() {
        this.width = viewport.scale_width(this.w);
        this.height = viewport.scale_height(this.h);
        this.div.style.width = this.width;
        this.div.style.height = this.height;
    }

    redraw_pos() {
        const x = viewport.to_screen_x(this.x - this.w);
        const y = viewport.to_screen_y(this.y - this.h);
        utils.set_transform(this.div, x, y);
    }
}
