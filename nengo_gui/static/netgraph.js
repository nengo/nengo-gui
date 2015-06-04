/**
 * Network diagram
 * @constructor
 *
 * @param {dict} args - A set of constructor arguments, including:
 * @param {int} args.id - the id of the server-side NetGraph to connect to
 * @param {DOMElement} args.parent - the element to add this component to
 */
Nengo.NetGraph = function(parent, args) {
    if (args.uid[0] === '<') {
        console.log("invalid uid for NetGraph: " + args.uid);
    }
    this.scale = 1.0;          // global scaling factor
    this.offsetX = 0;          // global x,y pan offset
    this.offsetY = 0;
    this.zoom_fonts = false;    // scale fonts when zooming
    this.font_size = 100;       // font size as a percent of base

    this.svg_objects = {};     // dict of all Nengo.NetGraphItems, by uid
    this.svg_conns = {};       // dict of all Nengo.NetGraphConnections, by uid
    this.minimap_objects = {};
    this.minimap_conns = {};

    this.mm_min_x = 0;
    this.mm_max_x = 0;
    this.mm_min_y = 0;
    this.mm_max_y = 0;

    this.mm_scale = .1;

    this.in_zoom_delay = false;

    /** Since connections may go to items that do not exist yet (since they
     *  are inside a collapsed network), this dictionary keeps a list of
     *  connections to be notified when a particular item appears.  The
     *  key in the dictionary is the uid of the nonexistent item, and the
     *  value is a list of Nengo.NetGraphConnections that should be notified
     *  when that item appears. */
    this.collapsed_conns = {};

    /** create the master SVG element */
    this.svg = this.createSVGElement('svg');
    this.svg.classList.add('netgraph');
    this.svg.style.width = '100%';
    this.svg.id = 'netgraph';
    this.svg.style.height = '100%';
    this.svg.style.position = 'absolute';

    interact(this.svg).styleCursor(false);

    Nengo.netgraph = this;
    parent.appendChild(this.svg);
    this.parent = parent;

    this.old_width = $(this.svg).width();
    this.old_height = $(this.svg).height();

    /** three separate layers, so that expanded networks are at the back,
     *  then connection lines, and then other items (nodes, ensembles, and
     *  collapsed networks) are drawn on top. */
    this.g_networks = this.createSVGElement('g');
    this.svg.appendChild(this.g_networks);
    this.g_conns = this.createSVGElement('g');
    this.svg.appendChild(this.g_conns);
    this.g_items = this.createSVGElement('g');
    this.svg.appendChild(this.g_items);

    /** connect to server */
    this.ws = Nengo.create_websocket(args.uid);
    this.ws.onmessage = function(event) {self.on_message(event);}

    /** respond to resize events */
    this.svg.addEventListener("resize", function() {self.on_resize();});
    window.addEventListener("resize", function() {self.on_resize();});

    /** dragging the background pans the full area by changing offsetX,Y */
    var self = this;

    /** define cursor behaviour for background */
    interact(this.svg)
        .on('mousedown', function() {
            var cursor = document.documentElement.getAttribute('style');
            if (cursor !== null) {
                if (cursor.match(/resize/) == null) {  // don't change resize cursor
                    document.documentElement.setAttribute('style','cursor:move;');
                }
            }
        })
        .on('mouseup', function() {
            document.documentElement.setAttribute('style','cursor:default;')
        });

    interact(this.svg)
        .draggable({
            onstart: function() {
                self.menu.hide_any();
            },
            onmove: function(event) {
                self.offsetX += event.dx / self.get_scaled_width();
                self.offsetY += event.dy / self.get_scaled_height();
                for (var key in self.svg_objects) {
                    self.svg_objects[key].redraw_position();
                    self.minimap_objects[key].redraw_position();
                }
                for (var key in self.svg_conns) {
                    self.svg_conns[key].redraw();
                    self.minimap_conns[key].redraw();
                }

                viewport.x = self.offsetX;
                viewport.y = self.offsetY;
                viewport.redraw_all();

                self.scaleMiniMapViewBox();

            },
            onend: function(event) {
                /** let the server know what happened */
                self.notify({act:"pan", x:self.offsetX, y:self.offsetY});
            }});

    /** scrollwheel on background zooms the full area by changing scale.
     *  Note that offsetX,Y are also changed to zoom into a particular
     *  point in the space */
    interact(document.getElementById('main'))
        .on('wheel', function(event) {
            event.preventDefault();

            self.menu.hide_any();

            var x = (event.clientX / $(self.svg).width())
            var y = (event.clientY / $(self.svg).height());

            switch (event.deltaMode) {
                case 1:  // DOM_DELTA_LINE
                    if (event.deltaY != 0) {
                        var delta = Math.log(1. + Math.abs(event.deltaY)) * 60;
                        if (event.deltaY < 0) {
                            delta *= -1;
                        }
                    } else {
                        var delta = 0;
                    }
                    break;
                case 2:  // DOM_DELTA_PAGE
                    // No idea what device would generate scrolling by a page
                    var delta = 0;
                    break;
                case 0:  // DOM_DELTA_PIXEL
                default:  // Assume pixel if unknown
                    var delta = event.deltaY;
                    break;
            }

            var scale = 1. + Math.abs(delta) / 600.;
            if (delta > 0) {
                scale = 1. / scale;
            }

            Nengo.Component.save_components();

            var xx = x / self.scale - self.offsetX;
            var yy = y / self.scale - self.offsetY;
            self.offsetX = (self.offsetX + xx) / scale - xx;
            self.offsetY = (self.offsetY + yy) / scale - yy;

            self.scale = scale * self.scale;
            viewport.scale = self.scale;
            viewport.x = self.offsetX;
            viewport.y = self.offsetY;
            viewport.redraw_all();

            self.scaleMiniMapViewBox();

            self.update_font_size();
            self.redraw();

            /** let the server know what happened */
            self.notify({act:"zoom", scale:self.scale,
                         x:self.offsetX, y:self.offsetY});
        });

    this.menu = new Nengo.Menu(self.parent);

    //Determine when to pull up the menu
    interact(this.svg)
        .on('hold', function(event) { //change to 'tap' for right click
            if (event.button == 0) {
                if (self.menu.visible_any()) {
                    self.menu.hide_any();
                } else {
                    self.menu.show(event.clientX, event.clientY,
                                   self.generate_menu());
                }
                event.stopPropagation();
            }
        })
        .on('tap', function(event) { //get rid of menus when clicking off
            if (event.button == 0) {
                if (self.menu.visible_any()) {
                    self.menu.hide_any();
                }
            }
        });

    $(this.svg).bind('contextmenu', function(event) {
            event.preventDefault();
            if (self.menu.visible_any()) {
                self.menu.hide_any();
            } else {
                self.menu.show(event.clientX, event.clientY,
                               self.generate_menu());
        }
    });

    this.create_minimap();
};

Nengo.NetGraph.prototype.generate_menu = function() {
    var self = this;
    var items = [];
    items.push(['Auto-layout',
                function() {self.notify({act:"feedforward_layout",
                            uid:null});}]);
    return items;

}

/** Event handler for received WebSocket messages */
Nengo.NetGraph.prototype.on_message = function(event) {
    data = JSON.parse(event.data);
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
        this.set_scale(data.zoom);
    } else if (data.type === 'expand') {
        var item = this.svg_objects[data.uid];
        item.expand(true,true)

        var item_mini = this.minimap_objects[data.uid];
        item_mini.expand(true,true)

    } else if (data.type === 'collapse') {
        var item = this.svg_objects[data.uid];
        item.collapse(true,true)

        var item_mini = this.minimap_objects[data.uid];
        item_mini.collapse(true,true)

    } else if (data.type === 'pos_size') {
        var item = this.svg_objects[data.uid];
        item.set_position(data.pos[0], data.pos[1]);
        item.set_size(data.size[0], data.size[1]);

        var item = this.minimap_objects[data.uid];
        item.set_position(data.pos[0], data.pos[1]);
        item.set_size(data.size[0], data.size[1]);

        this.scaleMiniMap();

    } else if (data.type === 'config') {
        // Anything about the config of a component has changed
        var uid = data.uid;
        for (var i = 0; i < Nengo.Component.components.length; i++) {
            if (Nengo.Component.components[i].uid === uid) {
                Nengo.Component.components[i].update_layout(data.config);
                break;
            }
        }
    } else if (data.type === 'js') {
        eval(data.code);
    } else if (data.type === 'rename') {
        var item = this.svg_objects[data.uid];
        item.set_label(data.name);

        var item_mini = this.minimap_objects[data.uid];
        item_mini.set_label(data.name);

    } else if (data.type === 'remove') {
        var item = this.svg_objects[data.uid];
        if (item === undefined) {
            item = this.svg_conns[data.uid];
        }
        item.remove();

        var item_mini = this.minimap_objects[data.uid];
        if (item_mini === undefined) {
            item_mini = this.minimap_conns[data.uid];
        }
        item_mini.remove();

    } else if (data.type === 'reconnect') {
        var conn = this.svg_conns[data.uid];
        conn.set_pres(data.pres);
        conn.set_posts(data.posts);
        conn.set_recurrent(data.pres[0] === data.posts[0]);
        conn.redraw();

        var conn_mini = this.minimap_conns[data.uid];
        conn_mini.set_pres(data.pres);
        conn_mini.set_posts(data.posts);
        conn_mini.redraw();

    } else if (data.type === 'delete_graph') {
        var uid = data.uid;
        for (var i = 0; i < Nengo.Component.components.length; i++) {
            if (Nengo.Component.components[i].uid === uid) {
                Nengo.Component.components[i].remove(true);
                break;
            }
        }
    } else {
        console.log('invalid message');
        console.log(data);
    }
};


/** report an event back to the server */
Nengo.NetGraph.prototype.notify = function(info) {
    this.ws.send(JSON.stringify(info));
}

/** pan the screen (and redraw accordingly) */
Nengo.NetGraph.prototype.set_offset = function(x, y) {
    this.offsetX = x;
    this.offsetY = y;
    this.redraw();

    viewport.x = x;
    viewport.y = y;
    viewport.redraw_all();
}


/** zoom the screen (and redraw accordingly) */
Nengo.NetGraph.prototype.set_scale = function(scale) {
    this.scale = scale;
    this.update_font_size();
    this.redraw();

    viewport.scale = scale;
    viewport.redraw_all();
}


Nengo.NetGraph.prototype.update_font_size = function(scale) {
    if (this.zoom_fonts) {
        $('#main').css('font-size', 3 * this.scale * this.font_size/100 + 'em');
    } else {
        $('#main').css('font-size', this.font_size/100 + 'em');
    }
}

Nengo.NetGraph.prototype.set_zoom_fonts = function(value) {
    this.zoom_fonts = value;
    this.update_font_size();
}

Nengo.NetGraph.prototype.get_zoom_fonts = function() {
    return this.zoom_fonts;
}

Nengo.NetGraph.prototype.set_font_size = function(value) {
    this.font_size = value;
    this.update_font_size();
}

Nengo.NetGraph.prototype.get_font_size = function() {
    return this.font_size;
}

/** redraw all elements */
Nengo.NetGraph.prototype.redraw = function() {
    for (var key in this.svg_objects) {
        this.svg_objects[key].redraw_position();
        this.svg_objects[key].redraw_size();

        this.minimap_objects[key].pos = this.svg_objects[key].pos
        this.minimap_objects[key].size = this.svg_objects[key].size
        this.minimap_objects[key].redraw_position();
        this.minimap_objects[key].redraw_size();
    }
    for (var key in this.svg_conns) {
        this.svg_conns[key].redraw();
        this.minimap_conns[key].redraw();
    }
}


/** helper function for correctly creating SVG elements */
Nengo.NetGraph.prototype.createSVGElement = function(tag) {
    return document.createElementNS("http://www.w3.org/2000/svg", tag);
}


/** Create a new NetGraphItem
 *  if an existing NetGraphConnection is looking for this item, it will be
 *  notified */
Nengo.NetGraph.prototype.create_object = function(info) {
    var item_mini = new Nengo.NetGraphItem(this, info, true);
    this.minimap_objects[info.uid] = item_mini;

    var item = new Nengo.NetGraphItem(this, info, false, item_mini);
    this.svg_objects[info.uid] = item;

    this.detect_collapsed_conns(item.uid);
    this.detect_collapsed_conns(item_mini.uid);

    this.scaleMiniMap();
};


/** create a new NetGraphConnection */
Nengo.NetGraph.prototype.create_connection = function(info) {
    var conn = new Nengo.NetGraphConnection(this, info, false);
    this.svg_conns[info.uid] = conn;

    var conn_mini = new Nengo.NetGraphConnection(this, info, true);
    this.minimap_conns[info.uid] = conn_mini;
};


/** handler for resizing the full SVG */
Nengo.NetGraph.prototype.on_resize = function(event) {

    this.redraw();

    var width = $(this.svg).width();
    var height = $(this.svg).height();

    this.old_width = width;
    this.old_height = height;
};


/** return the pixel width of the SVG times the current scale factor */
Nengo.NetGraph.prototype.get_scaled_width = function() {
    return $(this.svg).width() * this.scale;
}


/** return the pixel height of the SVG times the current scale factor */
Nengo.NetGraph.prototype.get_scaled_height = function() {
    return $(this.svg).height() * this.scale;
}


/** expand or collapse a network */
Nengo.NetGraph.prototype.toggle_network = function(uid) {
    var item = this.svg_objects[uid];
    if (item.expanded) {
        item.collapse(true);
    } else {
        item.expand();
    }

    var item_mini = this.minimap_objects[uid];
    if (item_mini.expanded) {
        item_mini.collapse(true);
    } else {
        item_mini.expand();
    }
}


/** register a NetGraphConnection with a target item that it is looking for
 *  This is a NetGraphItem that does not exist yet, because it is inside a
 *  collapsed network.  When it does appear, NetGraph.detect_collapsed will
 *  handle notifying the NetGraphConnection. */
Nengo.NetGraph.prototype.register_conn = function(conn, target) {
    if (this.collapsed_conns[target] === undefined) {
        this.collapsed_conns[target] = [conn];
    } else {
        var index = this.collapsed_conns[target].indexOf(conn);
        if (index === -1) {
            this.collapsed_conns[target].push(conn);
        }
    }
}


/** if a NetGraphConnection is looking for an item with a particular uid,
 *  but that item does not exist yet (due to it being inside a collapsed
 *  network), then it is added to the collapsed_conns dicutionary.  When
 *  an item is create, this function is used to see if any NetGraphConnections
 *  are waiting for it, and notifies them. */
Nengo.NetGraph.prototype.detect_collapsed_conns = function(uid) {
    var conns = this.collapsed_conns[uid];
    if (conns !== undefined) {
        delete this.collapsed_conns[uid];
        for (var i in conns) {
            var conn = conns[i];
            /** make sure the NetGraphConnection hasn't been removed since
             *  it started listening */
            if (!conn.removed) {
                conn.set_pre(conn.find_pre());
                conn.set_post(conn.find_post());
                conn.redraw();
            }
        }
    }
}

/** create a minimap */
Nengo.NetGraph.prototype.create_minimap = function () {
    var self = this;

    this.minimap_div = document.createElement('div');
    this.minimap_div.className = 'minimap';
    this.parent.appendChild(this.minimap_div);

    this.minimap = this.createSVGElement('svg');
    this.minimap.classList.add('minimap');
    this.minimap.id = 'minimap';
    this.minimap_div.appendChild(this.minimap);

    // box to show current view
    this.view = this.createSVGElement('rect');
    this.view.classList.add('view');
    this.minimap.appendChild(this.view);

    this.g_networks_mini = this.createSVGElement('g');
    this.g_conns_mini = this.createSVGElement('g');
    this.g_items_mini = this.createSVGElement('g');
    // order these are appended is important for layering
    this.minimap.appendChild(this.g_networks_mini);
    this.minimap.appendChild(this.g_conns_mini);
    this.minimap.appendChild(this.g_items_mini);

    // default display minimap
    this.mm_display = true;
    this.toggleMiniMap();
}

Nengo.NetGraph.prototype.toggleMiniMap = function () {
    if (this.mm_display == true) {
        $('.minimap')[0].style.visibility = 'hidden';
        this.g_conns_mini.style.opacity = 0;
        this.mm_display = false;
    } else {
        $('.minimap')[0].style.visibility = 'visible';
        this.g_conns_mini.style.opacity = 1;
        this.mm_display = true ;
    }
}

/** Calculate the minimap position offsets and scaling **/
Nengo.NetGraph.prototype.scaleMiniMap = function () {

    keys = Object.keys(this.svg_objects);
    if (keys.length === 0) {
        return;
    }

    // TODO: Could also store the items at the four min max values
    // and only compare against those, or check against all items
    // in the lists when they move. Might be important for larger
    // networks.
    var first_item = true;
    for (var key in this.svg_objects) {
        item = this.svg_objects[key];
        // ignore anything inside a subnetwork
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

    this.mm_scale =  1 / Math.max(this.mm_max_x - this.mm_min_x, this.mm_max_y - this.mm_min_y);

    // give a bit of a border
    this.mm_min_x -= this.mm_scale * .05;
    this.mm_max_x += this.mm_scale * .05;
    this.mm_min_y -= this.mm_scale * .05;
    this.mm_max_y += this.mm_scale * .05;
    // TODO: there is a better way to do this than recalculate
    this.mm_scale =  1 / Math.max(this.mm_max_x - this.mm_min_x, this.mm_max_y - this.mm_min_y);

    this.redraw();
    this.scaleMiniMapViewBox();
}

/** Calculate which part of the map is being displayed on the
 * main viewport and scale the viewbox to reflect that. */
Nengo.NetGraph.prototype.scaleMiniMapViewBox = function () {
    var w = $(this.minimap).width() * this.mm_scale;
    var h = $(this.minimap).height() * this.mm_scale;

    var view_offsetX = -(this.mm_min_x + this.offsetX) * w;
    var view_offsetY = -(this.mm_min_y + this.offsetY) * h;

    this.view.setAttributeNS(null, 'x', view_offsetX);
    this.view.setAttributeNS(null, 'y', view_offsetY);
    this.view.setAttribute('width', w / this.scale);
    this.view.setAttribute('height', h / this.scale);
}
