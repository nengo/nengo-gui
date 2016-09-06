/**
 * Network diagram individual item (node).
 *
 * @constructor
 * @param {NetGraph} ng - The NetGraph this Item is inside
 * @param {dict} info - A dictionary of settings for the item, including:
 * @param {float[]} info.pos - x,y position
 * @param {float[]} info.size - half width, half height of item
 * @param {string} info.type - one of ["net", "ens", "node"]
 * @param {string} info.uid - unique identifier
 * @param {string|null} info.parent - a NetGraphItem with .type=="net"
 */

import * as interact from "interact.js";
import * as $ from "jquery";

import * as menu from "../menu";
import * as utils from "../utils";

export default class NetGraphItem {
    area;
    aspect;
    child_connections;
    children;
    conn_in;
    conn_out;
    default_output;
    depth;
    dimensions;
    expanded;
    fixed_height;
    fixed_width;
    g;
    g_items;
    g_networks;
    height;
    html_node;
    itemtype;
    label;
    label_below;
    menu;
    min_height;
    min_width;
    mini_item;
    minimap;
    ng;
    parent;
    passthrough;
    shape;
    size;
    sp_targets;
    uid;
    width;
    x;
    y;

    constructor(ng, info, minimap, mini_item) {
        this.ng = ng;
        this.itemtype = info.type;
        this.uid = info.uid;
        this.sp_targets = info.sp_targets;
        this.default_output = info.default_output;
        this.passthrough = info.passthrough;
        this.fixed_width = null;
        this.fixed_height = null;
        this.dimensions = info.dimensions;
        this.minimap = minimap;
        this.html_node = info.html;
        if (minimap === false) {
            this.g_networks = this.ng.g_networks;
            this.g_items = this.ng.g_items;
            this.mini_item = mini_item;
        } else {
            this.g_networks = this.ng.g_networks_mini;
            this.g_items = this.ng.g_items_mini;
        }

        let width = info.size[0];
        Object.defineProperty(this, "width", {
            get: () => {
                return width;
            },
            set: val => {
                width = val;

                if (!this.minimap) {
                    this.mini_item.width = val;
                }
            },
        });
        let height = info.size[1];
        Object.defineProperty(this, "height", {
            get: () => {
                return height;
            },
            set: val => {
                height = val;

                if (!this.minimap) {
                    this.mini_item.height = val;
                }
            },
        });
        let x = info.pos[0];
        Object.defineProperty(this, "x", {
            get: () => {
                return x;
            },
            set: val => {
                x = val;

                if (!this.minimap) {
                    this.mini_item.x = val;
                }
            },
        });
        let y = info.pos[1];
        Object.defineProperty(this, "y", {
            get: () => {
                return y;
            },
            set: val => {
                y = val;

                if (!this.minimap) {
                    this.mini_item.y = val;
                }
            },
        });

        // If this is a network, the children list is the set of NetGraphItems
        // and NetGraphConnections that are inside this network.
        this.children = [];
        this.child_connections = [];

        // NetGraphConnections leading into and out of this item
        this.conn_out = [];
        this.conn_in = [];

        // Minimum and maximum drawn size, in pixels
        this.min_width = 5;
        this.min_height = 5;
        this.aspect = null;

        this.expanded = false;

        // Determine the parent NetGraphItem (if any) and the nested depth
        // of this item.
        if (info.parent === null) {
            this.parent = null;
            this.depth = 1;
        } else {
            this.parent = this.ng.svg_objects[info.parent];
            this.depth = this.parent.depth + 1;
            if (!minimap) {
                this.parent.children.push(this);
            }
        }

        // Create the SVG group to hold this item
        const g = this.ng.createSVGElement("g");
        this.g = g;
        this.g_items.appendChild(g);
        g.classList.add(this.itemtype);

        this.area = this.ng.createSVGElement("rect");
        this.area.setAttribute("style", "fill: transparent;");

        this.menu = new menu.Menu(this.ng.parent);

        // Different types use different SVG elements for display
        if (info.type === "node") {
            if (this.passthrough) {
                this.shape = this.ng.createSVGElement("ellipse");
                if (this.minimap === false) {
                    this.fixed_width = 10;
                    this.fixed_height = 10;
                } else {
                    this.fixed_width = 3;
                    this.fixed_height = 3;
                }
                this.g.classList.add("passthrough");
            } else {
                this.shape = this.ng.createSVGElement("rect");
            }
        } else if (info.type === "net") {
            this.shape = this.ng.createSVGElement("rect");
        } else if (info.type === "ens") {
            this.aspect = 1.;
            this.shape = this.ensemble_svg();
        } else {
            console.warn("Unknown NetGraphItem type:" + info.type);
        }

        this.compute_fill();

        if (this.minimap === false) {
            const label = this.ng.createSVGElement("text");
            this.label = label;
            utils.safe_set_text(label, info.label);
            g.appendChild(label);
        }

        g.appendChild(this.shape);
        g.appendChild(this.area);

        this.redraw();

        if (!this.minimap) {
            // Dragging an item to change its position
            const uid = this.uid;
            interact(g).draggable({
                onend: event => {
                    const item = this.ng.svg_objects[uid];
                    item.constrain_position();
                    this.ng.notify({
                        act: "pos", uid: uid, x: item.x, y: item.y,
                    });

                    item.redraw();
                },
                onmove: event => {
                    const item = this.ng.svg_objects[uid];
                    let w = this.ng.get_scaled_width();
                    let h = this.ng.get_scaled_height();
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
                    menu.hide_any();
                    this.move_to_front();
                },
            });

            if (!this.passthrough) {
                // Dragging the edge of item to change its size
                let tmp = this.shape;
                if (info.type === "ens") {
                    tmp = $(this.shape.getElementsByClassName("mainCircle"))[0];
                }
                interact(this.area).resizable({
                    edges: {bottom: true, left: true, right: true, top: true},
                    invert: this.itemtype === "ens" ? "reposition" : "none",
                    margin: 10,
                }).on("resizestart", event => {
                    menu.hide_any();
                }).on("resizemove", event => {
                    const item = this.ng.svg_objects[uid];
                    const pos = item.get_screen_location();
                    let h_scale = this.ng.get_scaled_width();
                    let v_scale = this.ng.get_scaled_height();
                    let parent = item.parent;
                    while (parent !== null) {
                        h_scale = h_scale * parent.width * 2;
                        v_scale = v_scale * parent.height * 2;
                        parent = parent.parent;
                    }

                    if (this.aspect !== null) {
                        this.constrain_aspect();

                        const vertical_resize =
                            event.edges.bottom || event.edges.top;
                        const horizontal_resize =
                            event.edges.left || event.edges.right;

                        let w = pos[0] - event.clientX + this.ng.offsetX;
                        let h = pos[1] - event.clientY + this.ng.offsetY;

                        if (event.edges.right) {
                            w *= -1;
                        }
                        if (event.edges.bottom) {
                            h *= -1;
                        }
                        if (w < 0) {
                            w = 1;
                        }
                        if (h < 0) {
                            h = 1;
                        }

                        const screen_w = item.width * h_scale;
                        const screen_h = item.height * v_scale;

                        if (horizontal_resize && vertical_resize) {
                            const p = (screen_w * w + screen_h * h) / Math.sqrt(
                                screen_w * screen_w + screen_h * screen_h);
                            const norm =
                                Math.sqrt(this.aspect * this.aspect + 1);
                            h = p / (this.aspect / norm);
                            w = p * (this.aspect / norm);
                        } else if (horizontal_resize) {
                            h = w / this.aspect;
                        } else {
                            w = h * this.aspect;
                        }

                        item.width = w / h_scale;
                        item.height = h / v_scale;
                    } else {
                        const dw = event.deltaRect.width / h_scale / 2;
                        const dh = event.deltaRect.height / v_scale / 2;
                        const offset_x = dw + event.deltaRect.left / h_scale;
                        const offset_y = dh + event.deltaRect.top / v_scale;

                        item.width += dw;
                        item.height += dh;
                        item.x += offset_x;
                        item.y += offset_y;
                    }

                    item.redraw();

                    if (this.depth === 1) {
                        this.ng.scaleMiniMap();
                    }
                }).on("resizeend", event => {
                    const item = this.ng.svg_objects[uid];
                    item.constrain_position();
                    item.redraw();
                    this.ng.notify({
                        act: "pos_size",
                        height: item.height,
                        uid: uid,
                        width: item.width,
                        x: item.x,
                        y: item.y,
                    });
                });
            }

            // Determine when to pull up the menu
            interact(this.g)
                .on("hold", event => {
                    // Change to "tap" for right click
                    if (event.button === 0) {
                        if (this.menu.visible_any()) {
                            menu.hide_any();
                        } else {
                            this.menu.show(event.clientX,
                                           event.clientY,
                                           this.generate_menu());
                        }
                        event.stopPropagation();
                    }
                })
                .on("tap", event => {
                    // Get rid of menus when clicking off
                    if (event.button === 0) {
                        if (this.menu.visible_any()) {
                            menu.hide_any();
                        }
                    }
                })
                .on("doubletap", event => {
                    // Get rid of menus when clicking off
                    if (event.button === 0) {
                        if (this.menu.visible_any()) {
                            menu.hide_any();
                        } else if (this.itemtype === "net") {
                            if (this.expanded) {
                                this.collapse(true);
                            } else {
                                this.expand();
                            }
                        }
                    }
                });
            $(this.g).bind("contextmenu", event => {
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

            if (info.type === "net") {
                // If a network is flagged to expand on creation, then expand it
                if (info.expanded) {
                    // Report to server but do not add to the undo stack
                    this.expand(true, true);
                }
            }
        }
    }

    set_label(label) {
        utils.safe_set_text(this.label, label);
    }

    move_to_front() {
        this.g.parentNode.appendChild(this.g);

        Object.keys(this.children).forEach(item => {
            this.children[item].move_to_front();
        });
    }

    generate_menu() {
        const items = [];
        if (this.itemtype === "net") {
            if (this.expanded) {
                items.push(["Collapse network", () => {
                    this.collapse(true);
                }]);
                items.push(["Auto-layout", () => {
                    this.request_feedforward_layout();
                }]);
            } else {
                items.push(["Expand network", () => {
                    this.expand();
                }]);
            }
            if (this.default_output && this.sp_targets.length === 0) {
                items.push(["Output Value", () => {
                    this.create_graph("Value");
                }]);
            }
        }
        if (this.itemtype === "ens") {
            items.push(["Value", () => {
                this.create_graph("Value");
            }]);
            if (this.dimensions > 1) {
                items.push(["XY-value", () => {
                    this.create_graph("XYValue");
                }]);
            }
            items.push(["Spikes", () => {
                this.create_graph("Raster");
            }]);
            items.push(["Voltages", () => {
                this.create_graph("Voltage");
            }]);
            items.push(["Firing pattern", () => {
                this.create_graph("SpikeGrid");
            }]);
        }
        if (this.itemtype === "node") {
            items.push(["Slider", () => {
                this.create_graph("Slider");
            }]);
            if (this.dimensions > 0) {
                items.push(["Value", () => {
                    this.create_graph("Value");
                }]);
            }
            if (this.dimensions > 1) {
                items.push(["XY-value", () => {
                    this.create_graph("XYValue");
                }]);
            }
            if (this.html_node) {
                items.push(["HTML", () => {
                    this.create_graph("HTMLView");
                }]);
            }
        }
        if (this.sp_targets.length > 0) {
            items.push(["Semantic pointer cloud", () => {
                this.create_graph("Pointer", this.sp_targets[0]);
            }]);
            items.push(["Semantic pointer plot", () => {
                this.create_graph("SpaSimilarity", this.sp_targets[0]);
            }]);
        }
        // TODO: Enable input and output value plots for basal ganglia network
        items.push(["Details ...", () => {
            this.create_modal();
        }]);
        return items;
    }

    create_graph(graphtype, args=null) { // tslint:disable-line
        const w = this.get_nested_width();
        const h = this.get_nested_height();
        const pos = this.get_screen_location();

        const info: any = {
            "act": "create_graph",
            "height": 100 / (this.ng.viewport.height * this.ng.viewport.scale),
            "type": graphtype,
            "uid": this.uid,
            "width": 100 / (this.ng.viewport.width * this.ng.viewport.scale),
            "x": pos[0] / (this.ng.viewport.width * this.ng.viewport.scale) -
                this.ng.viewport.x + w,
            "y": pos[1] / (this.ng.viewport.height * this.ng.viewport.scale) -
                this.ng.viewport.y + h,
        };

        if (args !== null) {
            info.args = args;
        }

        if (info.type === "Slider") {
            info.width /= 2;
        }

        this.ng.notify(info);
    }

    create_modal() {
        this.ng.notify({
            "act": "create_modal",
            "conn_in_uids": this.conn_in.map(c => {
                return c.uid;
            }),
            "conn_out_uids": this.conn_out.map(c => {
                return c.uid;
            }),
            "uid": this.uid,
        });
    }

    request_feedforward_layout() {
        this.ng.notify({act: "feedforward_layout", uid: this.uid});
    }

    /**
     * Expand a collapsed network.
     */
    expand(rts=true, auto=false) { // tslint:disable-line
        this.g.classList.add("expanded");

        if (!this.expanded) {
            this.expanded = true;
            if (this.ng.transparent_nets) {
                this.shape.setAttribute("fill-opacity", 0.0);
            }
            this.g_items.removeChild(this.g);
            this.g_networks.appendChild(this.g);
            if (!this.minimap) {
                this.mini_item.expand(rts, auto);
            }
        } else {
            console.warn(
                "expanded a network that was already expanded: " + this);
        }

        if (rts) {
            if (auto) {
                // Update the server, but do not place on the undo stack
                this.ng.notify({act: "auto_expand", uid: this.uid});
            } else {
                this.ng.notify({act: "expand", uid: this.uid});
            }
        }
    }

    set_label_below(flag) {
        if (flag && !this.label_below) {
            const screen_h = this.get_screen_height();
            this.label.setAttribute(
                "transform", "translate(0, " + (screen_h / 2) + ")");
        } else if (!flag && this.label_below) {
            this.label.setAttribute("transform", "");
        }
    }

    /**
     * Collapse an expanded network.
     */
    collapse(report_to_server, auto=false) { // tslint:disable-line
        this.g.classList.remove("expanded");

        // Remove child NetGraphItems and NetGraphConnections
        while (this.child_connections.length > 0) {
            this.child_connections[0].remove();
        }
        while (this.children.length > 0) {
            this.children[0].remove();
        }

        if (this.expanded) {
            this.expanded = false;
            if (this.ng.transparent_nets) {
                this.shape.style["fill-opacity"] = 1.0;
            }
            this.g_networks.removeChild(this.g);
            this.g_items.appendChild(this.g);
            if (!this.minimap) {
                this.mini_item.collapse(report_to_server, auto);
            }
        } else {
            console.warn(
                "collapsed a network that was already collapsed: " + this);
        }

        if (report_to_server) {
            if (auto) {
                // Update the server, but do not place on the undo stack
                this.ng.notify({act: "auto_collapse", uid: this.uid});
            } else {
                this.ng.notify({act: "collapse", uid: this.uid});
            }
        }
    }

    /**
     * Determine the fill color based on the depth.
     */
    compute_fill() {
        const depth = this.ng.transparent_nets ? 1 : this.depth;

        if (!this.passthrough) {
            const fill = Math.round(255 * Math.pow(0.8, depth));
            this.shape.setAttribute(
                "fill", "rgb(" + fill + "," + fill + "," + fill + ")");
            const stroke = Math.round(255 * Math.pow(0.8, depth + 2));
            this.shape.setAttribute(
                "stroke", "rgb(" + stroke + "," + stroke + "," + stroke + ")");
        }
    }

    /**
     * Remove the item from the graph.
     */
    remove() {
        if (this.expanded) {
            // Collapse the item, but don't tell the server since that would
            // update the server's config
            this.collapse(false);
        }

        // Remove the item from the parent's children list
        if (!this.minimap && this.parent !== null) {
            const index = this.parent.children.indexOf(this);
            this.parent.children.splice(index, 1);
        }

        delete this.ng.svg_objects[this.uid];

        // Update any connections into or out of this item
        const conn_in = this.conn_in.slice();
        conn_in.forEach(conn => {
            conn.set_post(conn.find_post());
            conn.redraw();
        });
        const conn_out = this.conn_out.slice();
        conn_out.forEach(conn => {
            conn.set_pre(conn.find_pre());
            conn.redraw();
        });

        // Remove from the SVG
        this.g_items.removeChild(this.g);
        if (this.depth === 1) {
            this.ng.scaleMiniMap();
        }

        if (!this.minimap) {
            this.mini_item.remove();
        }
    }

    constrain_aspect() {
        this.size = this.get_displayed_size();
    }

    get_displayed_size() {
        if (this.aspect !== null) {
            const h_scale = this.ng.get_scaled_width();
            const v_scale = this.ng.get_scaled_height();
            let w = this.get_nested_width() * h_scale;
            let h = this.get_nested_height() * v_scale;

            if (h * this.aspect < w) {
                w = h * this.aspect;
            } else if (w / this.aspect < h) {
                h = w / this.aspect;
            }

            return [w / h_scale, h / v_scale];
        } else {
            return [this.width, this.height];
        }
    }

    constrain_position() {
        this.constrain_aspect();

        if (this.parent !== null) {
            this.width = Math.min(0.5, this.width);
            this.height = Math.min(0.5, this.height);

            this.x = Math.min(this.x, 1.0 - this.width);
            this.x = Math.max(this.x, this.width);

            this.y = Math.min(this.y, 1.0 - this.height);
            this.y = Math.max(this.y, this.height);
        }
    }

    redraw_position() {
        const screen = this.get_screen_location();

        // Update my position
        this.g.setAttribute("transform", "translate(" + screen[0] + ", " +
                            screen[1] + ")");
    }

    redraw_children() {
        // Update any children's positions
        this.children.forEach(child => {
            child.redraw();
        });
    }

    redraw_child_connections() {
        // Update any children's positions
        this.child_connections.forEach(conn => {
            conn.redraw();
        });
    }

    redraw_connections() {
        // Update any connections into and out of this
        this.conn_in.forEach(conn => {
            conn.redraw();
        });
        this.conn_out.forEach(conn => {
            conn.redraw();
        });
    }

    /**
     * Return the width of the item, taking into account parent widths.
     */
    get_nested_width() {
        let w = this.width;
        let parent = this.parent;
        while (parent !== null) {
            w *= parent.width * 2;
            parent = parent.parent;
        }
        return w;
    }

    /**
     * Return the height of the item, taking into account parent heights.
     */
    get_nested_height() {
        let h = this.height;
        let parent = this.parent;
        while (parent !== null) {
            h *= parent.height * 2;
            parent = parent.parent;
        }
        return h;
    }

    redraw_size() {
        let screen_w = this.get_screen_width();
        let screen_h = this.get_screen_height();

        if (this.aspect !== null) {
            if (screen_h * this.aspect < screen_w) {
                screen_w = screen_h * this.aspect;
            } else if (screen_w / this.aspect < screen_h) {
                screen_h = screen_w / this.aspect;
            }
        }

        // The circle pattern isn't perfectly square, so make its area smaller
        const area_w = this.itemtype === "ens" ? screen_w * 0.97 : screen_w;
        const area_h = screen_h;
        this.area.setAttribute(
            "transform",
            "translate(-" + (area_w / 2) + ", -" + (area_h / 2) + ")");
        this.area.setAttribute("width", area_w);
        this.area.setAttribute("height", area_h);

        if (this.itemtype === "ens") {
            const scale = Math.sqrt(screen_h * screen_h + screen_w * screen_w) /
                Math.sqrt(2);
            const r = 17.8; // TODO: Don't hardcode the size of the ensemble
            this.shape.setAttribute(
                "transform", "scale(" + scale / 2 / r + ")");
            this.shape.setAttribute("stroke-width", 20 / scale);
        } else if (this.passthrough) {
            this.shape.setAttribute("rx", screen_w / 2);
            this.shape.setAttribute("ry", screen_h / 2);
        } else {
            this.shape.setAttribute(
                "transform",
                "translate(-" + (screen_w / 2) + ", -" + (screen_h / 2) + ")");
            this.shape.setAttribute("width", screen_w);
            this.shape.setAttribute("height", screen_h);
            if (this.itemtype === "node") {
                const radius = Math.min(screen_w, screen_h);
                // TODO: Don't hardcode .1 as the corner radius scale
                this.shape.setAttribute("rx", radius * .1);
                this.shape.setAttribute("ry", radius * .1);
            }
        }

        if (!this.minimap) {
            this.label.setAttribute(
                "transform", "translate(0, " + (screen_h / 2) + ")");
        }
    }

    get_screen_width() {
        if (this.minimap && !this.ng.mm_display) {
            return 1;
        }

        if (this.fixed_width !== null) {
            return this.fixed_width;
        }

        let w;
        let screen_w;
        if (!this.minimap) {
            w = this.ng.width;
            screen_w = this.get_nested_width() * w * this.ng.scale;
        } else {
            w = this.ng.mm_width;
            screen_w = this.get_nested_width() * w * this.ng.mm_scale;
        }

        if (screen_w < this.min_width) {
            screen_w = this.min_width;
        }

        return screen_w * 2;
    }

    get_screen_height() {
        if (this.minimap && !this.ng.mm_display) {
            return 1;
        }

        if (this.fixed_height !== null) {
            return this.fixed_height;
        }

        let h;
        let screen_h;
        if (this.minimap === false) {
            h = this.ng.height;
            screen_h = this.get_nested_height() * h * this.ng.scale;
        } else {
            h = this.ng.mm_height;
            screen_h = this.get_nested_height() * h * this.ng.mm_scale;
        }

        if (screen_h < this.min_height) {
            screen_h = this.min_height;
        }

        return screen_h * 2;
    }

    /**
     * Force a redraw of the item.
     */
    redraw() {
        this.redraw_position();
        this.redraw_size();
        this.redraw_children();
        this.redraw_child_connections();
        this.redraw_connections();

        if (!this.minimap && this.ng.mm_display) {
            this.mini_item.redraw();
        }
    }

    /**
     * Determine the pixel location of the centre of the item.
     */
    get_screen_location() {
        // FIXME: this should probably use this.ng.get_scaled_width
        // and this.ng.get_scaled_height
        if (this.minimap && !this.ng.mm_display) {
            return [1, 1];
        }

        let w;
        let h;
        let offsetX;
        let offsetY;
        if (this.minimap === false) {
            w = this.ng.width * this.ng.scale;
            h = this.ng.height * this.ng.scale;

            offsetX = this.ng.offsetX * w;
            offsetY = this.ng.offsetY * h;
        } else {
            const mm_w = this.ng.mm_width;
            const mm_h = this.ng.mm_height;

            w = mm_w * this.ng.mm_scale;
            h = mm_h * this.ng.mm_scale;

            const disp_w = (this.ng.mm_max_x - this.ng.mm_min_x) * w;
            const disp_h = (this.ng.mm_max_y - this.ng.mm_min_y) * h;

            offsetX = -this.ng.mm_min_x * w + (mm_w - disp_w) / 2.;
            offsetY = -this.ng.mm_min_y * h + (mm_h - disp_h) / 2.;
        }

        let dx = 0;
        let dy = 0;
        let parent = this.parent;
        while (parent !== null) {
            dx *= parent.width * 2;
            dy *= parent.height * 2;

            dx += (parent.x - parent.width);
            dy += (parent.y - parent.height);
            parent = parent.parent;
        }
        dx *= w;
        dy *= h;

        let ww = w;
        let hh = h;
        if (this.parent !== null) {
            ww *= this.parent.get_nested_width() * 2;
            hh *= this.parent.get_nested_height() * 2;
        }

        return [this.x * ww + dx + offsetX,
                this.y * hh + dy + offsetY];
    }

    /**
     * Function for drawing ensemble svg.
     */
    ensemble_svg() {
        const shape = this.ng.createSVGElement("g");
        shape.setAttribute("class", "ensemble");

        const dx = -1.25;
        const dy = 0.25;

        let circle = this.ng.createSVGElement("circle");
        this.setAttributes(
            circle, {"cx": -11.157 + dx, "cy": -7.481 + dy, "r": "4.843"});
        shape.appendChild(circle);
        circle = this.ng.createSVGElement("circle");
        this.setAttributes(
            circle, {"cx": 0.186 + dx, "cy": -0.127 + dy, "r": "4.843"});
        shape.appendChild(circle);
        circle = this.ng.createSVGElement("circle");
        this.setAttributes(
            circle, {"cx": 5.012 + dx, "cy": 12.56 + dy, "r": "4.843"});
        shape.appendChild(circle);
        circle = this.ng.createSVGElement("circle");
        this.setAttributes(
            circle, {"cx": 13.704 + dx, "cy": -0.771 + dy, "r": "4.843"});
        shape.appendChild(circle);
        circle = this.ng.createSVGElement("circle");
        this.setAttributes(
            circle, {"cx": -10.353 + dx, "cy": 8.413 + dy, "r": "4.843"});
        shape.appendChild(circle);
        circle = this.ng.createSVGElement("circle");
        this.setAttributes(
            circle, {"cx": 3.894 + dx, "cy": -13.158 + dy, "r": "4.843"});
        shape.appendChild(circle);

        return shape;
    }

    /**
     * Helper function for setting attributes.
     */
    setAttributes(el, attrs) {
        Object.keys(attrs).forEach(key => {
            el.setAttribute(key, attrs[key]);
        });
    }

    getMinMaxXY() {
        const min_x = this.x - this.width;
        const max_x = this.x + this.width;
        const min_y = this.y - this.height;
        const max_y = this.y + this.height;
        return [min_x, max_x, min_y, max_y];
    }
}
