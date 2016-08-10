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

import "./netgraph.css";
import * as comp from "./component";
import * as menu from "../menu";
import NetGraphConnection from "./netgraph_conn";
import NetGraphItem from "./netgraph_item";
import * as utils from "../utils";
import Viewport from "../viewport";

export default class NetGraph {

    constructor(parent, config, args) {
        var self = this;
        this.config = config;
        this.viewport = new Viewport(this);

        if (args.uid[0] === '<') {
            console.log("invalid uid for NetGraph: " + args.uid);
        }
        this.offsetX = 0; // Global x,y pan offset
        this.offsetY = 0;

        var scale = 1.0;
        Object.defineProperty(this, 'scale', {
            // Global scaling factor
            get: function() {
                return scale;
            },
            set: function(val) {
                if (val === scale) {
                    return;
                }
                scale = val;
                this.update_fonts();
                this.redraw();

                self.viewport.scale = scale;
                self.viewport.redraw_all();
            }
        });

        Object.defineProperty(this, 'zoom_fonts', {
            // Scale fonts when zooming
            get: function() {
                return self.config.zoom_fonts;
            },
            set: function(val) {
                if (val === this.zoom_fonts) {
                    return;
                }
                self.config.zoom_fonts = val;
                this.update_fonts();
            }
        });

        Object.defineProperty(this, 'aspect_resize', {
            // Preserve aspect ratios on window resize
            get: function() {
                return self.config.aspect_resize;
            },
            set: function(val) {
                if (val === this.aspect_resize) {
                    return;
                }
                self.config.aspect_resize = val;

            }
        });

        Object.defineProperty(this, 'font_size', {
            get: function() {
                return self.config.font_size;
            },
            set: function(val) {
                if (val === this.font_size) {
                    return;
                }
                self.config.font_size = val;
                this.update_fonts();
            }
        });

        // Do networks have transparent backgrounds?
        Object.defineProperty(this, 'transparent_nets', {
            get: function() {
                return self.config.transparent_nets;
            },
            set: function(val) {
                if (val === this.transparent_nets) {
                    return;
                }
                self.config.transparent_nets = val;
                for (var key in this.svg_objects) {
                    var ngi = this.svg_objects[key];
                    ngi.compute_fill();
                    if (ngi.type === 'net' && ngi.expanded) {
                        ngi.shape.style["fill-opacity"] = val ? 0.0 : 1.0;
                    }
                }

            }
        });

        this.svg_objects = {}; // Dict of all NetGraphItems, by uid
        this.svg_conns = {}; // Dict of all NetGraphConnections, by uid
        this.minimap_objects = {};
        this.minimap_conns = {};

        this.mm_min_x = 0;
        this.mm_max_x = 0;
        this.mm_min_y = 0;
        this.mm_max_y = 0;

        this.mm_scale = .1;

        this.in_zoom_delay = false;

        // Since connections may go to items that do not exist yet (since they
        // are inside a collapsed network), this dictionary keeps a list of
        // connections to be notified when a particular item appears.  The
        // key in the dictionary is the uid of the nonexistent item, and the
        // value is a list of NetGraphConnections that should be notified
        // when that item appears.
        this.collapsed_conns = {};

        // Create the master SVG element
        this.svg = this.createSVGElement('svg');
        this.svg.classList.add('netgraph');
        this.svg.style.width = '100%';
        this.svg.id = 'netgraph';
        this.svg.style.height = '100%';
        this.svg.style.position = 'absolute';

        interact(this.svg).styleCursor(false);

        parent.appendChild(this.svg);
        this.parent = parent;

        this.width = $(this.svg).width();
        this.height = $(this.svg).height();

        this.tool_height = $(toolbar.toolbar).height();

        // Three separate layers, so that expanded networks are at the back,
        // then connection lines, and then other items (nodes, ensembles, and
        // collapsed networks) are drawn on top.
        this.g_networks = this.createSVGElement('g');
        this.svg.appendChild(this.g_networks);
        this.g_conns = this.createSVGElement('g');
        this.svg.appendChild(this.g_conns);
        this.g_items = this.createSVGElement('g');
        this.svg.appendChild(this.g_items);

        // Reading netgraph.css file as text and embedding it within def tags;
        // this is needed for saving the SVG plot to disk.

        // Load contents of the CSS file as string
        var css = require('!!css-loader!./netgraph.css').toString();
        // Embed CSS code into SVG tag
        var s = document.createElement('style');
        s.setAttribute('type', 'text/css');
        s.innerHTML = "<![CDATA[\n" + css + "\n]]>";

        var defs = document.createElement('defs');
        defs.appendChild(s);

        this.svg.insertBefore(defs, this.svg.firstChild);

        // Connect to server
        this.ws = utils.create_websocket(args.uid);
        this.ws.onmessage = function(event) {
            self.on_message(event);
        };

        // Respond to resize events
        this.svg.addEventListener("resize", function() {
            self.on_resize();
        });
        window.addEventListener("resize", function() {
            self.on_resize();
        });

        // Dragging the background pans the full area by changing offsetX,Y
        var self = this;

        // Define cursor behaviour for background
        interact(this.svg)
            .on('mousedown', function() {
                var cursor = document.documentElement.getAttribute('style');
                if (cursor !== null) {
                    if (cursor.match(/resize/) == null) {
                        // Don't change resize cursor
                        document.documentElement.setAttribute(
                            'style', 'cursor:move;');
                    }
                }
            })
            .on('mouseup', function() {
                document.documentElement.setAttribute('style', 'cursor:default;');
            });

        interact(this.svg)
            .draggable({
                onstart: function() {
                    menu.hide_any();
                },
                onmove: function(event) {
                    self.offsetX += event.dx / self.get_scaled_width();
                    self.offsetY += event.dy / self.get_scaled_height();
                    for (var key in self.svg_objects) {
                        self.svg_objects[key].redraw_position();
                        if (self.mm_display) {
                            self.minimap_objects[key].redraw_position();
                        }
                    }
                    for (var key in self.svg_conns) {
                        self.svg_conns[key].redraw();
                    }

                    self.viewport.x = self.offsetX;
                    self.viewport.y = self.offsetY;
                    self.viewport.redraw_all();

                    self.scaleMiniMapViewBox();

                },
                onend: function(event) {
                    // Let the server know what happened
                    self.notify({act: "pan", x: self.offsetX, y: self.offsetY});
                }});

        // Scrollwheel on background zooms the full area by changing scale.
        // Note that offsetX,Y are also changed to zoom into a particular
        // point in the space
        interact(document.getElementById('main'))
            .on('click', function(event) {
                $('.ace_text-input').blur();
            })
            .on('wheel', function(event) {
                event.preventDefault();

                menu.hide_any();
                var x = (event.clientX) / self.width;
                var y = (event.clientY - self.tool_height) / self.height;

                if (event.deltaMode === 1) {
                    // DOM_DELTA_LINE
                    if (event.deltaY != 0) {
                        var delta = Math.log(1. + Math.abs(event.deltaY)) * 60;
                        if (event.deltaY < 0) {
                            delta *= -1;
                        }
                    } else {
                        var delta = 0;
                    }
                } else if (event.deltaMode === 2) {
                    // DOM_DELTA_PAGE
                    // No idea what device would generate scrolling by a page
                    var delta = 0;
                } else {
                    // DOM_DELTA_PIXEL
                    var delta = event.deltaY;
                }

                var scale = 1. + Math.abs(delta) / 600.;
                if (delta > 0) {
                    scale = 1. / scale;
                }

                comp.save_all_components();

                var xx = x / self.scale - self.offsetX;
                var yy = y / self.scale - self.offsetY;
                self.offsetX = (self.offsetX + xx) / scale - xx;
                self.offsetY = (self.offsetY + yy) / scale - yy;

                self.scale = scale * self.scale;
                self.viewport.x = self.offsetX;
                self.viewport.y = self.offsetY;
                self.viewport.redraw_all();

                self.scaleMiniMapViewBox();

                self.redraw();

                // Let the server know what happened
                self.notify({
                    act: "zoom", scale: self.scale, x: self.offsetX, y: self.offsetY
                });
            });

        this.menu = new menu.Menu(self.parent);

        // Determine when to pull up the menu
        interact(this.svg)
            .on('hold', function(event) { // Change to 'tap' for right click
                if (event.button == 0) {
                    if (self.menu.visible_any()) {
                        menu.hide_any();
                    } else {
                        self.menu.show(event.clientX, event.clientY,
                                       self.generate_menu());
                    }
                    event.stopPropagation();
                }
            })
            .on('tap', function(event) { // Get rid of menus when clicking off
                if (event.button == 0) {
                    if (self.menu.visible_any()) {
                        menu.hide_any();
                    }
                }
            });

        $(this.svg).bind('contextmenu', function(event) {
            event.preventDefault();
            if (self.menu.visible_any()) {
                menu.hide_any();
            } else {
                self.menu.show(event.clientX, event.clientY, self.generate_menu());
            }
        });

        this.create_minimap();
        this.update_fonts();
    };

    generate_menu() {
        var self = this;
        var items = [];
        items.push(['Auto-layout', function() {
            self.notify({act: "feedforward_layout", uid: null});
        }]);
        return items;
    };

    /**
     * Event handler for received WebSocket messages
     */
    on_message(event) {
        var data = JSON.parse(event.data);
        if (data.type === 'net') {
            this.create_object(data);
        } else if (data.type === 'ens') {
            this.create_object(data);
        } else if (data.type === 'node') {
            this.create_object(data);
        } else if (data.type === 'conn') {
            this.create_connection(data);
        } else if (data.type === 'pan') {
            this.set_offset(data.pan[0], data.pan[1]);
        } else if (data.type === 'zoom') {
            this.scale = data.zoom;
        } else if (data.type === 'expand') {
            var item = this.svg_objects[data.uid];
            item.expand(true, true);
        } else if (data.type === 'collapse') {
            var item = this.svg_objects[data.uid];
            item.collapse(true, true);
        } else if (data.type === 'pos_size') {
            var item = this.svg_objects[data.uid];
            item.x = data.pos[0];
            item.y = data.pos[1];
            item.width = data.size[0];
            item.height = data.size[1];

            item.redraw();

            this.scaleMiniMap();

        } else if (data.type === 'config') {
            // Anything about the config of a component has changed
            var uid = data.uid;
            for (var i = 0; i < comp.all_components.length; i++) {
                if (comp.all_components[i].uid === uid) {
                    comp.all_components[i].update_layout(data.config);
                    break;
                }
            }
        } else if (data.type === 'js') {
            eval(data.code);
        } else if (data.type === 'rename') {
            var item = this.svg_objects[data.uid];
            item.set_label(data.name);

        } else if (data.type === 'remove') {
            var item = this.svg_objects[data.uid];
            if (item === undefined) {
                item = this.svg_conns[data.uid];
            }

            item.remove();

        } else if (data.type === 'reconnect') {
            var conn = this.svg_conns[data.uid];
            conn.set_pres(data.pres);
            conn.set_posts(data.posts);
            conn.set_recurrent(data.pres[0] === data.posts[0]);
            conn.redraw();

        } else if (data.type === 'delete_graph') {
            var uid = data.uid;
            for (var i = 0; i < comp.all_components.length; i++) {
                if (comp.all_components[i].uid === uid) {
                    comp.all_components[i].remove(true, data.notify_server);
                    break;
                }
            }
        } else {
            console.log('invalid message');
            console.log(data);
        }
    };

    /**
     * Report an event back to the server
     */
    notify(info) {
        this.ws.send(JSON.stringify(info));
    };

    /**
     * Pan the screen (and redraw accordingly)
     */
    set_offset(x, y) {
        this.offsetX = x;
        this.offsetY = y;
        this.redraw();

        this.viewport.x = x;
        this.viewport.y = y;
        this.viewport.redraw_all();
    };

    update_fonts() {
        if (this.zoom_fonts) {
            $('#main').css('font-size', 3 * this.scale * this.font_size/100 + 'em');
        } else {
            $('#main').css('font-size', this.font_size/100 + 'em');
        }
    };

    /**
     * Redraw all elements
     */
    redraw() {
        for (var key in this.svg_objects) {
            this.svg_objects[key].redraw();
        }
        for (var key in this.svg_conns) {
            this.svg_conns[key].redraw();
        }
    };

    /**
     * Helper function for correctly creating SVG elements.
     */
    createSVGElement(tag) {
        return document.createElementNS("http://www.w3.org/2000/svg", tag);
    };

    /**
     * Create a new NetGraphItem.
     *
     * If an existing NetGraphConnection is looking for this item, it will be
     * notified
     */
    create_object(info) {
        var item_mini = new NetGraphItem(this, info, true);
        this.minimap_objects[info.uid] = item_mini;

        var item = new NetGraphItem(this, info, false, item_mini);
        this.svg_objects[info.uid] = item;

        this.detect_collapsed_conns(item.uid);
        this.detect_collapsed_conns(item_mini.uid);

        this.scaleMiniMap();
    };

    /**
     * Create a new NetGraphConnection.
     */
    create_connection(info) {
        var conn_mini = new NetGraphConnection(this, info, true);
        this.minimap_conns[info.uid] = conn_mini;

        var conn = new NetGraphConnection(this, info, false, conn_mini);
        this.svg_conns[info.uid] = conn;
    };

    /**
     * Handler for resizing the full SVG.
     */
    on_resize(event) {
        var width = $(this.svg).width();
        var height = $(this.svg).height();

        if (this.aspect_resize) {
            for (var key in this.svg_objects) {
                var item = this.svg_objects[key];
                if (item.depth == 1) {
                    var new_width = item.get_screen_width() / this.scale;
                    var new_height = item.get_screen_height() / this.scale;
                    item.width = new_width/(2*width);
                    item.height = new_height/(2*height);
                }
            }
        }

        this.width = width;
        this.height = height;
        this.mm_width = $(this.minimap).width();
        this.mm_height = $(this.minimap).height();

        this.redraw();
    };

    /**
     * Return the pixel width of the SVG times the current scale factor.
     */
    get_scaled_width() {
        return this.width * this.scale;
    };

    /**
     * Return the pixel height of the SVG times the current scale factor.
     */
    get_scaled_height() {
        return this.height * this.scale;
    };

    /**
     * Expand or collapse a network.
     */
    toggle_network(uid) {
        var item = this.svg_objects[uid];
        if (item.expanded) {
            item.collapse(true);
        } else {
            item.expand();
        }
    };

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
            var index = this.collapsed_conns[target].indexOf(conn);
            if (index === -1) {
                this.collapsed_conns[target].push(conn);
            }
        }
    };

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
        var conns = this.collapsed_conns[uid];
        if (conns !== undefined) {
            delete this.collapsed_conns[uid];
            for (var i in conns) {
                var conn = conns[i];
                // Make sure the NetGraphConnection hasn't been removed since
                // it started listening.
                if (!conn.removed) {
                    conn.set_pre(conn.find_pre());
                    conn.set_post(conn.find_post());
                    conn.redraw();
                }
            }
        }
    };

    /**
     * Create a minimap.
     */
    create_minimap() {
        var self = this;

        this.minimap_div = document.createElement('div');
        this.minimap_div.className = 'minimap';
        this.parent.appendChild(this.minimap_div);

        this.minimap = this.createSVGElement('svg');
        this.minimap.classList.add('minimap');
        this.minimap.id = 'minimap';
        this.minimap_div.appendChild(this.minimap);

        // Box to show current view
        this.view = this.createSVGElement('rect');
        this.view.classList.add('view');
        this.minimap.appendChild(this.view);

        this.g_networks_mini = this.createSVGElement('g');
        this.g_conns_mini = this.createSVGElement('g');
        this.g_items_mini = this.createSVGElement('g');
        // Order these are appended is important for layering
        this.minimap.appendChild(this.g_networks_mini);
        this.minimap.appendChild(this.g_conns_mini);
        this.minimap.appendChild(this.g_items_mini);

        this.mm_width = $(this.minimap).width();
        this.mm_height = $(this.minimap).height();

        // Default display minimap
        this.mm_display = true;
        this.toggleMiniMap();
    };

    toggleMiniMap() {
        if (this.mm_display == true) {
            $('.minimap')[0].style.visibility = 'hidden';
            this.g_conns_mini.style.opacity = 0;
            this.mm_display = false;
        } else {
            $('.minimap')[0].style.visibility = 'visible';
            this.g_conns_mini.style.opacity = 1;
            this.mm_display = true ;
            this.scaleMiniMap();
        }
    };

    /**
     * Calculate the minimap position offsets and scaling.
     */
    scaleMiniMap() {
        if (!this.mm_display) {
            return;
        }

        var keys = Object.keys(this.svg_objects);
        if (keys.length === 0) {
            return;
        }

        // TODO: Could also store the items at the four min max values
        // and only compare against those, or check against all items
        // in the lists when they move. Might be important for larger
        // networks.
        var first_item = true;
        for (var key in this.svg_objects) {
            var item = this.svg_objects[key];
            // Ignore anything inside a subnetwork
            if (item.depth > 1) {
                continue;
            }

            var minmax_xy = item.getMinMaxXY();
            if (first_item == true) {
                this.mm_min_x = minmax_xy[0];
                this.mm_max_x = minmax_xy[1];
                this.mm_min_y = minmax_xy[2];
                this.mm_max_y = minmax_xy[3];
                first_item = false;
                continue;
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
        }

        this.mm_scale = 1 /
            Math.max(this.mm_max_x - this.mm_min_x, this.mm_max_y - this.mm_min_y);

        // Give a bit of a border
        this.mm_min_x -= this.mm_scale * .05;
        this.mm_max_x += this.mm_scale * .05;
        this.mm_min_y -= this.mm_scale * .05;
        this.mm_max_y += this.mm_scale * .05;
        // TODO: there is a better way to do this than recalculate
        this.mm_scale = 1 /
            Math.max(this.mm_max_x - this.mm_min_x, this.mm_max_y - this.mm_min_y);

        this.redraw();
        this.scaleMiniMapViewBox();
    };

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

        var mm_w = this.mm_width;
        var mm_h = this.mm_height;

        var w = mm_w * this.mm_scale;
        var h = mm_h * this.mm_scale;

        var disp_w = (this.mm_max_x - this.mm_min_x) * w;
        var disp_h = (this.mm_max_y - this.mm_min_y) * h;

        var view_offsetX = -(this.mm_min_x + this.offsetX) *
            w + (mm_w - disp_w) / 2.;
        var view_offsetY = -(this.mm_min_y + this.offsetY) *
            h + (mm_h - disp_h) / 2.;

        this.view.setAttributeNS(null, 'x', view_offsetX);
        this.view.setAttributeNS(null, 'y', view_offsetY);
        this.view.setAttribute('width', w / this.scale);
        this.view.setAttribute('height', h / this.scale);
    };

}
