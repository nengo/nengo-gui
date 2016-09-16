/**
 * Network diagram.
 *
 * @constructor
 * @param {DOMElement} parent - the element to add this component to
 * @param {dict} args - A set of constructor arguments, including:
 * @param {int} args.id - the id of the server-side NetGraph to connect to
 *
 * NetGraph constructor is written into HTML file from the python
 * server and is run on page load.
 */

import * as interact from "interact.js";
import * as $ from "jquery";
import { dom, h } from "maquette";

import * as all_components from "../components/all_components";
import { config } from "../config";
import * as menu from "../menu";
import * as utils from "../utils";
import * as viewport from "../viewport";
import { NetGraphConnection } from "./connection";
import { Minimap } from "./minimap";
import { NetGraphItem } from "./item";
import "./netgraph.css";

interface ItemDict {
    [uid: string]: NetGraphItem;
}

interface ConnDict {
    [uid: string]: NetGraphConnection;
}

export class NetGraph {

    /**
     * Since connections may go to items that do not exist yet (since they
     * are inside a collapsed network), this dictionary keeps a list of
     * connections to be notified when a particular item appears.  The
     * key in the dictionary is the uid of the nonexistent item, and the
     * value is a list of NetGraphConnections that should be notified
     * when that item appears.
     */
    collapsed_conns: ConnDict = {};
    div;
    g_conns;
    g_conns_mini;
    g_items;
    g_items_mini;
    g_networks;
    g_networks_mini;
    height;
    in_zoom_delay;
    menu;
    minimap;
    offset_x = 0; // Global x,y pan offset
    offset_y = 0; // Global x,y pan offset
    svg: VNode;
    svg_conns: ConnDict = {};
    svg_objects: ItemDict = {};
    tool_height;
    uid: string;
    view;
    width;
    ws;
    private _scale: number = 1.0;

    constructor(uid: string) {
        this.uid = uid;

        if (uid[0] === "<") {
            console.warn("invalid uid for NetGraph: " + uid);
        }

        this.in_zoom_delay = false;

        // this.minimap = new Minimap();

        this.tool_height = $("#toolbar_object").height();

        // Reading netgraph.css file as text and embedding it within def tags;
        // this is needed for saving the SVG plot to disk.
        const css = require("!!css-loader!./netgraph.css").toString();

        const defs = h("defs", [h(
            "style", {type: "text/css"}, ["<![CDATA[\n" + css + "\n]]>"]
        )]);

        // Three separate layers, so that expanded networks are at the back,
        // then connection lines, and then other items (nodes, ensembles, and
        // collapsed networks) are drawn on top.
        this.g_networks = h("g");
        this.g_conns = h("g");
        this.g_items = h("g");

        // Create the master SVG element
        this.svg = h("svg.netgraph#netgraph", {
            styles: {width: "100%", height: "100%", position: "absolute"},
            onresize: event => {
                this.on_resize(event);
            },
        }, [
            defs,
            this.g_networks,
            this.g_conns,
            this.g_items,
        ]);

        // interact(this.svg).styleCursor(false);

        this.width = $(this.svg).width();
        this.height = $(this.svg).height();

        // Connect to server
        this.ws = utils.create_websocket(uid);
        this.ws.onmessage = event => {
            this.on_message(event);
        };

        // Respond to resize events
        window.addEventListener("resize", event => {
            this.on_resize(event);
        });

        // Dragging the background pans the full area by changing offset_x,Y
        // Define cursor behaviour for background
        interact(this.svg)
            .on("mousedown", () => {
                const cursor = document.documentElement.getAttribute("style");
                if (cursor !== null) {
                    if (cursor.match(/resize/) == null) {
                        // Don't change resize cursor
                        document.documentElement.setAttribute(
                            "style", "cursor:move;");
                    }
                }
            })
            .on("mouseup", () => {
                document.documentElement
                    .setAttribute("style", "cursor:default;");
            });

        interact(this.svg)
            .draggable({
                onend: event => {
                    // Let the server know what happened
                    this.notify({act: "pan", x: this.offset_x, y: this.offset_y});
                },
                onmove: event => {
                    this.offset_x += event.dx / this.get_scaled_width();
                    this.offset_y += event.dy / this.get_scaled_height();
                    Object.keys(this.svg_objects).forEach(key => {
                        this.svg_objects[key].redraw_position();
                        if (this.mm_display) {
                            this.minimap_objects[key].redraw_position();
                        }
                    });
                    Object.keys(this.svg_conns).forEach(key => {
                        this.svg_conns[key].redraw();
                    });

                    viewport.set_position(this.offset_x, this.offset_y);

                    this.scaleMiniMapViewBox();

                },
                onstart: () => {
                    menu.hide_any();
                },
            });

        // Scrollwheel on background zooms the full area by changing scale.
        // Note that offset_x,Y are also changed to zoom into a particular
        // point in the space
        interact(document.getElementById("main"))
            .on("click", event => {
                $(".ace_text-input").blur();
            })
            .on("wheel", event => {
                event.preventDefault();

                menu.hide_any();
                const x = (event.clientX) / this.width;
                const y = (event.clientY - this.tool_height) / this.height;
                let delta;

                if (event.deltaMode === 1) {
                    // DOM_DELTA_LINE
                    if (event.deltaY !== 0) {
                        delta = Math.log(1. + Math.abs(event.deltaY)) * 60;
                        if (event.deltaY < 0) {
                            delta *= -1;
                        }
                    } else {
                        delta = 0;
                    }
                } else if (event.deltaMode === 2) {
                    // DOM_DELTA_PAGE
                    // No idea what device would generate scrolling by a page
                    delta = 0;
                } else {
                    // DOM_DELTA_PIXEL
                    delta = event.deltaY;
                }

                let z_scale = 1. + Math.abs(delta) / 600.;
                if (delta > 0) {
                    z_scale = 1. / z_scale;
                }

                all_components.save_layouts();

                const xx = x / this.scale - this.offset_x;
                const yy = y / this.scale - this.offset_y;
                this.offset_x = (this.offset_x + xx) / z_scale - xx;
                this.offset_y = (this.offset_y + yy) / z_scale - yy;

                this.scale = z_scale * this.scale;
                viewport.set_position(this.offset_x, this.offset_y);

                this.scaleMiniMapViewBox();

                this.redraw();

                // Let the server know what happened
                this.notify({
                    act: "zoom",
                    scale: this.scale,
                    x: this.offset_x,
                    y: this.offset_y,
                });
            });

        this.menu = new menu.Menu(this.parent);

        // Determine when to pull up the menu
        interact(this.svg)
            .on("hold", event => { // Change to "tap" for right click
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

        $(this.svg).bind("contextmenu", event => {
            event.preventDefault();
            if (this.menu.visible_any()) {
                menu.hide_any();
            } else {
                this.menu.show(
                    event.clientX, event.clientY, this.generate_menu());
            }
        });

        this.create_minimap();
        this.update_fonts();
    }

    get aspect_resize(): boolean {
        return config.aspect_resize;
    }

    set aspect_resize(val) {
        if (val === this.aspect_resize) {
            return;
        }
        config.aspect_resize = val;
    }

    get font_size(): number {
        return config.font_size;
    }

    set font_size(val: number) {
        if (val === this.font_size) {
            return;
        }
        config.font_size = val;
        this.update_fonts();
    }

    get scale(): number {
        return this._scale;
    }

    set scale(val: number) {
        if (val === this._scale) {
            return;
        }
        this._scale = val;
        this.update_fonts();
        this.redraw();

        viewport.set_scale(this._scale);
    }

    get transparent_nets(): boolean {
        return config.transparent_nets;
    }

    set transparent_nets(val: boolean) {
        if (val === config.transparent_nets) {
            return;
        }
        config.transparent_nets = val;
        Object.keys(this.svg_objects).forEach(key => {
            const ngi = this.svg_objects[key];
            ngi.compute_fill();
            if (ngi.type === "net" && ngi.expanded) {
                ngi.shape.style["fill-opacity"] = val ? 0.0 : 1.0;
            }
        });
    }

    get zoom_fonts(): boolean {
        return config.zoom_fonts;
    }

    set zoom_fonts(val: boolean) {
        if (val === config.zoom_fonts) {
            return;
        }
        config.zoom_fonts = val;
        this.update_fonts();
    }

    generate_menu() {
        return [["Auto-layout", () => {
            this.notify({act: "feedforward_layout", uid: null});
        }]];
    }

    /**
     * Event handler for received WebSocket messages
     */
    on_message(event) {
        const data = JSON.parse(event.data);
        let item;

        if (data.type === "net") {
            this.create_object(data);
        } else if (data.type === "ens") {
            this.create_object(data);
        } else if (data.type === "node") {
            this.create_object(data);
        } else if (data.type === "conn") {
            this.create_connection(data);
        } else if (data.type === "pan") {
            this.set_offset(data.pan[0], data.pan[1]);
        } else if (data.type === "zoom") {
            this.scale = data.zoom;
        } else if (data.type === "expand") {
            item = this.svg_objects[data.uid];
            item.expand(true, true);
        } else if (data.type === "collapse") {
            item = this.svg_objects[data.uid];
            item.collapse(true, true);
        } else if (data.type === "pos_size") {
            item = this.svg_objects[data.uid];
            item.x = data.pos[0];
            item.y = data.pos[1];
            item.width = data.size[0];
            item.height = data.size[1];

            item.redraw();

            this.scaleMiniMap();

        } else if (data.type === "config") {
            // Anything about the config of a component has changed
            const component = all_components.by_uid(data.uid);
            component.update_layout(data.config);
        } else if (data.type === "js") {
            eval(data.code); // tslint:disable-line
        } else if (data.type === "rename") {
            item = this.svg_objects[data.uid];
            item.set_label(data.name);

        } else if (data.type === "remove") {
            item = this.svg_objects[data.uid];
            if (item === undefined) {
                item = this.svg_conns[data.uid];
            }

            item.remove();

        } else if (data.type === "reconnect") {
            const conn = this.svg_conns[data.uid];
            conn.set_pres(data.pres);
            conn.set_posts(data.posts);
            conn.set_recurrent(data.pres[0] === data.posts[0]);
            conn.redraw();

        } else if (data.type === "delete_graph") {
            const component = all_components.by_uid(data.uid);
            component.remove(true, data.notify_server);
        } else {
            console.warn("invalid message:" + data);
        }
    }

    /**
     * Report an event back to the server
     */
    notify(info) {
        this.ws.send(JSON.stringify(info));
    }

    /**
     * Pan the screen (and redraw accordingly)
     */
    set_offset(x, y) {
        this.offset_x = x;
        this.offset_y = y;
        this.redraw();

        viewport.set_position(x, y);
    }

    update_fonts() {
        if (this.zoom_fonts) {
            $("#main").css("font-size",
                           3 * this.scale * this.font_size / 100 + "em");
        } else {
            $("#main").css("font-size", this.font_size / 100 + "em");
        }
    }

    /**
     * Redraw all elements
     */
    redraw() {
        Object.keys(this.svg_objects).forEach(key => {
            this.svg_objects[key].redraw();
        });
        Object.keys(this.svg_conns).forEach(key => {
            this.svg_conns[key].redraw();
        });
    }

    /**
     * Helper function for correctly creating SVG elements.
     */
    createSVGElement(tag) {
        return document.createElementNS("http://www.w3.org/2000/svg", tag);
    }

    /**
     * Create a new NetGraphItem.
     *
     * If an existing NetGraphConnection is looking for this item, it will be
     * notified
     */
    create_object(info) {
        const item_mini = new NetGraphItem(this, info, true, null);
        this.minimap_objects[info.uid] = item_mini;

        const item = new NetGraphItem(this, info, false, item_mini);
        this.svg_objects[info.uid] = item;

        this.detect_collapsed_conns(item.uid);
        this.detect_collapsed_conns(item_mini.uid);

        this.scaleMiniMap();
    }

    /**
     * Create a new NetGraphConnection.
     */
    create_connection(info) {
        const conn_mini = new NetGraphConnection(this, info, true, null);
        this.minimap_conns[info.uid] = conn_mini;

        const conn = new NetGraphConnection(this, info, false, conn_mini);
        this.svg_conns[info.uid] = conn;
    }

    /**
     * Handler for resizing the full SVG.
     */
    on_resize(event) {
        const width = $(this.svg).width();
        const height = $(this.svg).height();

        if (this.aspect_resize) {
            Object.keys(this.svg_objects).forEach(key => {
                const item = this.svg_objects[key];
                if (item.depth === 1) {
                    const new_width = viewport.scale_width(item.w) / this.scale;
                    const new_height =
                        viewport.scale_height(item.h) / this.scale;
                    item.width = new_width / (2 * width);
                    item.height = new_height / (2 * height);
                }
            });
        }

        this.width = width;
        this.height = height;
        this.mm_width = $(this.minimap).width();
        this.mm_height = $(this.minimap).height();

        this.redraw();
    }

    /**
     * Return the pixel width of the SVG times the current scale factor.
     */
    get_scaled_width() {
        return this.width * this.scale;
    }

    /**
     * Return the pixel height of the SVG times the current scale factor.
     */
    get_scaled_height() {
        return this.height * this.scale;
    }

    /**
     * Expand or collapse a network.
     */
    toggle_network(uid) {
        const item = this.svg_objects[uid];
        if (item.expanded) {
            item.collapse(true);
        } else {
            item.expand();
        }
    }

    /**
     * Register a NetGraphConnection with a target item that it is looking for.
     *
     * This is a NetGraphItem that does not exist yet, because it is inside a
     * collapsed network. When it does appear, NetGraph.detect_collapsed will
     * handle notifying the NetGraphConnection.
     */
    register_conn(conn, target) {
        if (this.collapsed_conns[target] === undefined) {
            this.collapsed_conns[target] = [conn];
        } else {
            const index = this.collapsed_conns[target].indexOf(conn);
            if (index === -1) {
                this.collapsed_conns[target].push(conn);
            }
        }
    }

    /**
     * Manage collapsed_conns dictionary.
     *
     * If a NetGraphConnection is looking for an item with a particular uid,
     * but that item does not exist yet (due to it being inside a collapsed
     * network), then it is added to the collapsed_conns dictionary. When
     * an item is created, this function is used to see if any
     * NetGraphConnections are waiting for it, and notifies them.
     */
    detect_collapsed_conns(uid) {
        const conns = this.collapsed_conns[uid];
        if (conns !== undefined) {
            delete this.collapsed_conns[uid];
            for (let i = 0; i < conns.length; i++) {
                const conn = conns[i];
                // Make sure the NetGraphConnection hasn't been removed since
                // it started listening.
                if (!conn.removed) {
                    conn.set_pre(conn.find_pre());
                    conn.set_post(conn.find_post());
                    conn.redraw();
                }
            }
        }
    }

    /**
     * Create a minimap.
     */
    create_minimap() {
        this.minimap_div = document.createElement("div");
        this.minimap_div.className = "minimap";
        this.parent.appendChild(this.minimap_div);

        this.minimap = this.createSVGElement("svg");
        this.minimap.classList.add("minimap");
        this.minimap.id = "minimap";
        this.minimap_div.appendChild(this.minimap);

        // Box to show current view
        this.view = this.createSVGElement("rect");
        this.view.classList.add("view");
        this.minimap.appendChild(this.view);

        this.g_networks_mini = this.createSVGElement("g");
        this.g_conns_mini = this.createSVGElement("g");
        this.g_items_mini = this.createSVGElement("g");
        // Order these are appended is important for layering
        this.minimap.appendChild(this.g_networks_mini);
        this.minimap.appendChild(this.g_conns_mini);
        this.minimap.appendChild(this.g_items_mini);

        this.mm_width = $(this.minimap).width();
        this.mm_height = $(this.minimap).height();

        // Default display minimap
        this.mm_display = true;
        this.toggleMiniMap();
    }

    toggleMiniMap() {
        if (this.mm_display === true) {
            $(".minimap")[0].style.visibility = "hidden";
            this.g_conns_mini.style.opacity = 0;
            this.mm_display = false;
        } else {
            $(".minimap")[0].style.visibility = "visible";
            this.g_conns_mini.style.opacity = 1;
            this.mm_display = true ;
            this.scaleMiniMap();
        }
    }

    /**
     * Calculate the minimap position offsets and scaling.
     */
    scaleMiniMap() {
        if (!this.mm_display) {
            return;
        }

        const keys = Object.keys(this.svg_objects);
        if (keys.length === 0) {
            return;
        }

        // TODO: Could also store the items at the four min max values
        // and only compare against those, or check against all items
        // in the lists when they move. Might be important for larger
        // networks.
        let first_item = true;
        Object.keys(this.svg_objects).forEach(key => {
            const item = this.svg_objects[key];
            // Ignore anything inside a subnetwork
            if (item.depth > 1) {
                return;
            }

            const minmax_xy = item.getMinMaxXY();
            if (first_item === true) {
                this.mm_min_x = minmax_xy[0];
                this.mm_max_x = minmax_xy[1];
                this.mm_min_y = minmax_xy[2];
                this.mm_max_y = minmax_xy[3];
                first_item = false;
                return;
            }

            if (this.mm_min_x > minmax_xy[0]) {
                this.mm_min_x = minmax_xy[0];
            }
            if (this.mm_max_x < minmax_xy[1]) {
                this.mm_max_x = minmax_xy[1];
            }
            if (this.mm_min_y > minmax_xy[2]) {
                this.mm_min_y = minmax_xy[2];
            }
            if (this.mm_max_y < minmax_xy[3]) {
                this.mm_max_y = minmax_xy[3];
            }
        });

        this.mm_scale = 1 / Math.max(this.mm_max_x - this.mm_min_x,
                                     this.mm_max_y - this.mm_min_y);

        // Give a bit of a border
        this.mm_min_x -= this.mm_scale * .05;
        this.mm_max_x += this.mm_scale * .05;
        this.mm_min_y -= this.mm_scale * .05;
        this.mm_max_y += this.mm_scale * .05;
        // TODO: there is a better way to do this than recalculate
        this.mm_scale = 1 / Math.max(this.mm_max_x - this.mm_min_x,
                                     this.mm_max_y - this.mm_min_y);

        this.redraw();
        this.scaleMiniMapViewBox();
    }

    /**
     * Scale the viewbox in the minimap.
     *
     * Calculate which part of the map is being displayed on the
     * main viewport and scale the viewbox to reflect that.
     */
    scaleMiniMapViewBox() {
        if (!this.mm_display) {
            return;
        }

        const mm_w = this.mm_width;
        const mm_h = this.mm_height;

        const w = mm_w * this.mm_scale;
        const h = mm_h * this.mm_scale;

        const disp_w = (this.mm_max_x - this.mm_min_x) * w;
        const disp_h = (this.mm_max_y - this.mm_min_y) * h;

        const view_offset_x = -(this.mm_min_x + this.offset_x) *
            w + (mm_w - disp_w) / 2.;
        const view_offset_y = -(this.mm_min_y + this.offset_y) *
            h + (mm_h - disp_h) / 2.;

        this.view.setAttributeNS(null, "x", view_offset_x);
        this.view.setAttributeNS(null, "y", view_offset_y);
        this.view.setAttribute("width", w / this.scale);
        this.view.setAttribute("height", h / this.scale);
    }
}
