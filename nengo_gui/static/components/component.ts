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

import * as interact from "interact.js";
import * as $ from "jquery";

import * as menu from "../menu";
import * as utils from "../utils";

export var all_components = [];

export function save_all_components() {
    for (let i = 0; i < all_components.length; i++) {
        all_components[i].save_layout();
    }
};

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
    viewport;
    w;
    width;
    ws;
    x;
    y;

    constructor(parent, viewport, args) {
        const self = this;

        this.viewport = viewport;

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
        this.label.innerHTML = args.label.replace("<", "&lt;").replace(">", "&gt;");
        this.label.style.position = "fixed";
        this.label.style.width = args.width;
        this.label.style.height = "2em";
        this.label_visible = true;
        this.div.appendChild(this.label);
        if (args.label_visible === false) {
            this.hide_label(null);
        }

        self.min_width = 2;
        self.min_height = 2;

        // Move element to be drawn on top when clicked on

        this.div.onmousedown = function() {
            this.style.zIndex = utils.next_zindex();
        };

        this.div.ontouchstart = this.div.onmousedown;

        // Allow element to be dragged
        interact(this.div)
            .draggable({
                inertia: true,
                onend: function(event) {
                    self.save_layout();
                },
                onmove: function(event) {
                    self.x = self.x + event.dx /
                        (self.viewport.width * self.viewport.scale);
                    self.y = self.y + event.dy /
                        (self.viewport.height * self.viewport.scale);
                    self.redraw_pos();
                },
                onstart: function() {
                    menu.hide_any();
                },
            });

        // Allow element to be resized
        interact(this.div)
            .resizable({
                edges: { bottom: true, left: true, right: true, top: true },
            })
            .on("resizestart", function(event) {
                menu.hide_any();
            })
            .on("resizemove", function(event) {
                const newWidth = event.rect.width;
                const newHeight = event.rect.height;
                const dx = event.deltaRect.left;
                const dy = event.deltaRect.top;
                const dz = event.deltaRect.right;
                const da = event.deltaRect.bottom;

                self.x += (dx + dz) / 2 /
                    (self.viewport.width * self.viewport.scale);
                self.y += (dy + da) / 2 /
                    (self.viewport.height * self.viewport.scale);

                self.w = newWidth /
                    (self.viewport.width * self.viewport.scale) / 2;
                self.h = newHeight /
                    (self.viewport.height * self.viewport.scale) / 2;

                self.on_resize(newWidth, newHeight);
                self.redraw_size();
                self.redraw_pos();
            })
            .on("resizeend", function(event) {
                self.save_layout();
            });

        // Open a WebSocket to the server
        this.uid = args.uid;
        if (this.uid !== undefined) {
            this.ws = utils.create_websocket(this.uid);
            this.ws.onmessage = function(event) {
                self.on_message(event);
            };
        }

        // Flag whether there is a scheduled update that hasn't happened yet
        this.pending_update = false;

        this.menu = new menu.Menu(self.parent);
        interact(this.div)
            .on("hold", function(event) { // Change to 'tap' for right click
                if (event.button === 0) {
                    if (self.menu.visible_any()) {
                        menu.hide_any();
                    } else {
                        self.menu.show(event.clientX, event.clientY,
                                       self.generate_menu());
                    }
                    event.stopPropagation();
                }
            })
            .on("tap", function(event) { // Get rid of menus when clicking off
                if (event.button === 0) {
                    if (self.menu.visible_any()) {
                        menu.hide_any();
                    }
                }
            });
        $(this.div).bind("contextmenu", function(event) {
            event.preventDefault();
            event.stopPropagation();
            if (self.menu.visible_any()) {
                menu.hide_any();
            } else {
                self.menu.show(event.clientX, event.clientY, self.generate_menu());
            }
        });

        all_components.push(this);
    };

    /**
     * Method to be called when Component is resized.
     */
    on_resize(width, height) {
        // Subclasses should implement this.
    };

    /**
     * Method to be called when Component received a WebSocket message.
     */
    on_message(event) {
        // Subclasses should implement this.
    };

    generate_menu() {
        const self = this;
        const items = [];
        if (this.label_visible) {
            items.push(["Hide label", function() {
                self.hide_label(null);
                self.save_layout();
            }]);
        } else {
            items.push(["Show label", function() {
                self.show_label(null);
                self.save_layout();
            }]);
        }
        items.push(["Remove", function() {
            self.remove(undefined, undefined);
        }]);
        return items;
    };

    remove(undo_flag, notify_server) {
        undo_flag = typeof undo_flag !== "undefined" ? undo_flag : false;
        notify_server = typeof notify_server !== "undefined" ? notify_server : true;

        if (notify_server) {
            if (undo_flag === true) {
                this.ws.send("remove_undo");
            } else {
                this.ws.send("remove");
            }
        }
        this.parent.removeChild(this.div);
        const index = all_components.indexOf(this);
        all_components.splice(index, 1);
    };

    /**
     * Schedule update() to be called in the near future.
     *
     * If update() is already scheduled, then do nothing. This is meant to limit
     * how fast update() is called in the case that we are changing the data faster
     * than whatever processing is needed in update().
     */
    schedule_update(event) {
        if (this.pending_update === false) {
            this.pending_update = true;
            const self = this;
            window.setTimeout(function() {
                self.pending_update = false;
                self.update(null);
            }, 10);
        }
    };

    /**
     * Do any visual updating that is needed due to changes in the underlying data.
     */
    update(event) {
        // Subclasses should implement this.
    };

    hide_label(event) {
        if (this.label_visible) {
            this.label.style.display = "none";
            this.label_visible = false;
        }
    };

    show_label(event) {
        if (!this.label_visible) {
            this.label.style.display = "inline";
            this.label_visible = true;
        }
    };

    layout_info() {
        return {
            "height": this.h,
            "label_visible": this.label_visible,
            "width": this.w,
            "x": this.x,
            "y": this.y,
        };
    };

    save_layout() {
        const info = this.layout_info();
        this.ws.send("config:" + JSON.stringify(info));
    };

    update_layout(config) {
        this.w = config.width;
        this.h = config.height;
        this.x = config.x;
        this.y = config.y;

        this.redraw_size();
        this.redraw_pos();
        this.on_resize(this.get_screen_width(), this.get_screen_height());

        if (config.label_visible === true) {
            this.show_label(null);
        } else {
            this.hide_label(null);
        }
    };

    redraw_size() {
        const vpscale = this.viewport.scale * 2;
        this.width = this.viewport.width * this.w * vpscale;
        this.height = this.viewport.height * this.h * vpscale;
        this.div.style.width = this.width;
        this.div.style.height = this.height;
    };

    redraw_pos() {
        const x = (this.x + this.viewport.x - this.w) *
            this.viewport.width * this.viewport.scale;
        const y = (this.y + this.viewport.y - this.h) *
            this.viewport.height * this.viewport.scale;
        utils.set_transform(this.div, x, y);
    };

    get_screen_width() {
        return this.viewport.width * this.w * this.viewport.scale * 2;
    };

    get_screen_height() {
        return this.viewport.height * this.h * this.viewport.scale * 2;
    };
}
