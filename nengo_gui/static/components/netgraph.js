/**
 * Network diagram
 * @constructor
 *
 * @param {DOMElement} parent - the element to add this component to
 * @param {dict} args - A set of constructor arguments, including:
 * @param {int} args.id - the id of the server-side NetGraph to connect to
 *
 * NetGraph constructor is written into HTML file from the python
 * server and is run on page load.
 */
Nengo.NetGraph = function(parent, args) {
    if (args.uid[0] === '<') {
        console.log("invalid uid for NetGraph: " + args.uid);
    }
    this.offsetX = 0;          // global x,y pan offset
    this.offsetY = 0;

    var scale = 1.0;
    Object.defineProperty(this, 'scale', {
        // global scaling factor
        get: function() {
            return scale;
        },
        set: function(val) {
            if (val === scale) { return; }
            scale = val;
            this.update_fonts();
            this.redraw();

            viewport.scale = scale;
            viewport.redraw_all();
        }

    });

    Object.defineProperty(this, 'zoom_fonts', {
        // scale fonts when zooming
        get: function() {
            return Nengo.config.zoom_fonts;
        },
        set: function(val) {
            if (val === this.zoom_fonts) { return; }
            Nengo.config.zoom_fonts = val;
            this.update_fonts();
        }
    });

    Object.defineProperty(this, 'aspect_resize', {
        //preserve aspect ratios on window resize
        get: function() {
            return Nengo.config.aspect_resize;
        },
        set: function(val) {
            if (val === this.aspect_resize) { return; }
            Nengo.config.aspect_resize = val;

        }

    });

    Object.defineProperty(this, 'font_size', {
        get: function() {
            return Nengo.config.font_size;
        },
        set: function(val) {
            if (val === this.font_size) { return; }
            Nengo.config.font_size = val;
            this.update_fonts();
        }
    });

    // Do networks have transparent backgrounds?
    Object.defineProperty(this, 'transparent_nets', {
        get: function() {
            return Nengo.config.transparent_nets;
        },
        set: function(val) {
            if (val === this.transparent_nets) { return; }
            Nengo.config.transparent_nets = val;
            for (var key in this.svg_objects) {
                var ngi = this.svg_objects[key];
                ngi.compute_fill();
                if (ngi.type === 'net' && ngi.expanded) {
                    ngi.shape.style["fill-opacity"] = val ? 0.0 : 1.0;
                }
            }

        }
    });

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

    this.width = $(this.svg).width();
    this.height = $(this.svg).height();
    
    this.tool_height = $(toolbar.toolbar).height();

    /** three separate layers, so that expanded networks are at the back,
     *  then connection lines, and then other items (nodes, ensembles, and
     *  collapsed networks) are drawn on top. */
    this.g_networks = this.createSVGElement('g');
    this.svg.appendChild(this.g_networks);
    this.g_conns = this.createSVGElement('g');
    this.svg.appendChild(this.g_conns);
    this.g_items = this.createSVGElement('g');
    this.svg.appendChild(this.g_items);

    /** Reading netgraph.css file as text and embedding it within def tags,
     *  this is needed for saving the SVG plot to disk*/

    /** load contents of the CSS file as string */
    var file = document.getElementById('netgraphcss');
    var css = Array.prototype.map.call(file.sheet.cssRules, function
            css_text(x) {return x.cssText; } ).join('\n');

    /** embed CSS code into SVG tag */
    var s = document.createElement('style');
    s.setAttribute('type', 'text/css');
    s.innerHTML = "<![CDATA[\n" + css + "\n]]>";

    var defs = document.createElement('defs');
    defs.appendChild(s);

    this.svg.insertBefore(defs, this.svg.firstChild);

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
                    if (self.mm_display) {
                        self.minimap_objects[key].redraw_position();
                    }
                }
                for (var key in self.svg_conns) {
                    self.svg_conns[key].redraw();
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
        .on('click', function(event) {
            $('.ace_text-input').blur();
        })
        .on('wheel', function(event) {
            event.preventDefault();

            self.menu.hide_any();
            var x = (event.clientX) / self.width
            var y = (event.clientY - self.tool_height) / self.height;


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
            viewport.x = self.offsetX;
            viewport.y = self.offsetY;
            viewport.redraw_all();

            self.scaleMiniMapViewBox();

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
        this.scale = data.zoom;
    } else if (data.type === 'expand') {
        var item = this.svg_objects[data.uid];
        item.expand(true,true)
    } else if (data.type === 'collapse') {
        var item = this.svg_objects[data.uid];
        item.collapse(true,true)
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
        for (var i = 0; i < Nengo.Component.components.length; i++) {
            if (Nengo.Component.components[i].uid === uid) {
                Nengo.Component.components[i].remove(true, data.notify_server);
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


Nengo.NetGraph.prototype.update_fonts = function() {
    if (this.zoom_fonts) {
        $('#main').css('font-size', 3 * this.scale * this.font_size/100 + 'em');
    } else {
        $('#main').css('font-size', this.font_size/100 + 'em');
    }
}

/** redraw all elements */
Nengo.NetGraph.prototype.redraw = function() {
    for (var key in this.svg_objects) {
    	this.svg_objects[key].redraw();
    }
    for (var key in this.svg_conns) {
        this.svg_conns[key].redraw();
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
	var conn_mini = new Nengo.NetGraphConnection(this, info, true);
    this.minimap_conns[info.uid] = conn_mini;
    
    var conn = new Nengo.NetGraphConnection(this, info, false, conn_mini);
    this.svg_conns[info.uid] = conn;
};


/** handler for resizing the full SVG */
Nengo.NetGraph.prototype.on_resize = function(event) {

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


/** return the pixel width of the SVG times the current scale factor */
Nengo.NetGraph.prototype.get_scaled_width = function() {
    return this.width * this.scale;
}


/** return the pixel height of the SVG times the current scale factor */
Nengo.NetGraph.prototype.get_scaled_height = function() {
    return this.height * this.scale;
}


/** expand or collapse a network */
Nengo.NetGraph.prototype.toggle_network = function(uid) {
    var item = this.svg_objects[uid];
    if (item.expanded) {
        item.collapse(true);
    } else {
        item.expand();
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

    this.mm_width = $(this.minimap).width();
    this.mm_height = $(this.minimap).height();
    
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
        this.scaleMiniMap();
    }
}

/** Calculate the minimap position offsets and scaling **/
Nengo.NetGraph.prototype.scaleMiniMap = function () {
    if (!this.mm_display) { return; }

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
    if (!this.mm_display) { return; }
    
    var mm_w = this.mm_width
    var mm_h = this.mm_height

    var w = mm_w * this.mm_scale;
    var h = mm_h * this.mm_scale;

    var disp_w = (this.mm_max_x - this.mm_min_x) * w;
    var disp_h = (this.mm_max_y - this.mm_min_y) * h;

    var view_offsetX = -(this.mm_min_x + this.offsetX) * w + (mm_w - disp_w) / 2.;
    var view_offsetY = -(this.mm_min_y + this.offsetY) * h + (mm_h - disp_h) / 2.;

    this.view.setAttributeNS(null, 'x', view_offsetX);
    this.view.setAttributeNS(null, 'y', view_offsetY);
    this.view.setAttribute('width', w / this.scale);
    this.view.setAttribute('height', h / this.scale);
}

/** Called from the individual component ondragmove handlers in order to pan
 * the entire view whenever CTRL or the middle mouse button are pressed.
 * Returns true if the event has been processed by the NetGraph component and
 * no further event processing must be performed by the calling code.
 * Returns false otherwise. */
Nengo.NetGraph.prototype.capture_move_event = function (event) {
    // For more constants see https://www.w3.org/TR/uievents/#mouseevent
    var MOUSE_BUTTON_MIDDLE_MASK = 4

    if (event.ctrlKey || (event.buttons & MOUSE_BUTTON_MIDDLE_MASK)) {
        interact(this.svg).ondragmove(event);
        return true;
    }
    return false;
}
