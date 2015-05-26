/**
 * Network diagram
 * @constructor
 *
 * @param {dict} args - A set of constructor arguments, including:
 * @param {int} args.id - the id of the server-side NetGraph to connect to
 * @param {DOMElement} args.parent - the element to add this component to
 */
VIZ.NetGraph = function(parent, args) {
    this.scale = 1.0;          // global scaling factor
    this.offsetX = 0;          // global x,y pan offset 
    this.offsetY = 0;
    
    this.svg_objects = {};     // dict of all VIZ.NetGraphItems, by uid
    this.svg_conns = {};       // dict of all VIZ.NetGraphConnections, by uid

    this.in_zoom_delay = false;
    
    this.window_resize_type = 2; //Testing window resize types:
                                 //0: original (resizes/moves everything)
                                 //1: same_size (moves things, resizes nothing)
                                 //2: static (moves and resizes nothing)

    /** Since connections may go to items that do not exist yet (since they
     *  are inside a collapsed network), this dictionary keeps a list of
     *  connections to be notified when a particular item appears.  The
     *  key in the dictionary is the uid of the nonexistent item, and the
     *  value is a list of VIZ.NetGraphConnections that should be notified
     *  when that item appears. */
    this.collapsed_conns = {}; 
    
    /** create the master SVG element */
    this.svg = this.createSVGElement('svg');
    this.svg.classList.add('netgraph');    
    this.svg.style.width = '100%';
    this.svg.id = 'netgraph';
    this.svg.style.height = 'calc(100% - 80px)';
    this.svg.style.position = 'fixed';    
        
    interact(this.svg).styleCursor(false);
           
    VIZ.netgraph = this;
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
    this.ws = VIZ.create_websocket(args.uid);
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
                VIZ.pan.shift(event.dx, event.dy);
                self.offsetX += event.dx / self.get_scaled_width();
                self.offsetY += event.dy / self.get_scaled_height();
                for (var key in self.svg_objects) {
                    self.svg_objects[key].redraw_position();
                }    
                for (var key in self.svg_conns) {
                    self.svg_conns[key].redraw();
                }    
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
            if (self.in_zoom_delay) {
                return;
            }
            self.in_zoom_delay = true;
            setTimeout(function () { self.in_zoom_delay = false; }, 50);

            self.menu.hide_any();

            var x = (event.clientX / $(self.svg).width())
            var y = (event.clientY / $(self.svg).height());

            var delta = event.wheelDeltaY || -event.deltaY
            var scale = delta > 0 ? VIZ.scale.step_size : 1.0 / VIZ.scale.step_size; // will either be 1.1 or ~0.9

            //scale and save components
            VIZ.scale.zoom(scale, event.clientX, event.clientY);
            VIZ.Component.save_components();

            var xx = x / self.scale - self.offsetX;
            var yy = y / self.scale - self.offsetY;
            self.offsetX = (self.offsetX + xx) / scale - xx;
            self.offsetY = (self.offsetY + yy) / scale - yy;
            
            self.scale = scale * self.scale;

            self.redraw();

            /** let the server know what happened */
            self.notify({act:"zoom", scale:self.scale, 
                         x:self.offsetX, y:self.offsetY});
        });

    //Get the pan/zoom screen up and running after netgraph is built
    VIZ.pan.screen_init();

    this.menu = new VIZ.Menu(self.parent);

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
};

VIZ.NetGraph.prototype.generate_menu = function() {
    var self = this;
    var items = [];
    items.push(['Auto-layout', 
                function() {self.notify({act:"feedforward_layout",
                            uid:null});}]);
    return items;

}

/** Event handler for received WebSocket messages */
VIZ.NetGraph.prototype.on_message = function(event) {
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
    } else if (data.type === 'pos_size') {
        var item = this.svg_objects[data.uid];
        item.set_position(data.pos[0], data.pos[1]);
        item.set_size(data.size[0], data.size[1]);
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
        conn.redraw();
    } else {
        console.log('invalid message');
        console.log(data);
    }
};  


/** report an event back to the server */
VIZ.NetGraph.prototype.notify = function(info) {
    this.ws.send(JSON.stringify(info));
}

/** pan the screen (and redraw accordingly) */
VIZ.NetGraph.prototype.set_offset = function(x, y) {
    this.offsetX = x;
    this.offsetY = y;
    this.redraw();
    
    var dx = VIZ.Screen.ul.x - x * this.get_scaled_width();
    var dy = VIZ.Screen.ul.y - y * this.get_scaled_height();
    VIZ.pan.shift(-dx, -dy);    
}


/** zoom the screen (and redraw accordingly) */
VIZ.NetGraph.prototype.set_scale = function(scale) {
    this.scale = scale;
    this.redraw();

    VIZ.Screen.lr.x = VIZ.Screen.ul.x + $(this.svg).width() / scale;
    VIZ.Screen.lr.y = VIZ.Screen.ul.y + $(this.svg).height() / scale;
    VIZ.pan.redraw();
}


/** redraw all elements */
VIZ.NetGraph.prototype.redraw = function(type) {
    for (var key in this.svg_objects) {
        if (type != "static") {
            this.svg_objects[key].redraw_position();
        }
        if (type =="default") {
            this.svg_objects[key].redraw_size();
        }
    }    
    if (type !="static") {
        for (var key in this.svg_conns) {
            this.svg_conns[key].redraw();
        }    
    }
}


/** helper function for correctly creating SVG elements */
VIZ.NetGraph.prototype.createSVGElement = function(tag) {
    return document.createElementNS("http://www.w3.org/2000/svg", tag);
}


/** Create a new NetGraphItem 
 *  if an existing NetGraphConnection is looking for this item, it will be
 *  notified */
VIZ.NetGraph.prototype.create_object = function(info) {
    var item = new VIZ.NetGraphItem(this, info);
    this.svg_objects[info.uid] = item;    
    this.detect_collapsed_conns(item.uid);
};


/** create a new NetGraphConnection */
VIZ.NetGraph.prototype.create_connection = function(info) {
    var conn = new VIZ.NetGraphConnection(this, info);
    this.svg_conns[info.uid] = conn;    
};


/** handler for resizing the full SVG */
VIZ.NetGraph.prototype.on_resize = function(event) {
    if (this.window_resize_type==1) {
        this.redraw("same_size");
        VIZ.pan.redraw();
    } else if (this.window_resize_type==2) {
        this.redraw("static");
    } else {
        this.redraw("default");
        VIZ.pan.redraw();
    }
        
    var width = $(this.svg).width();
    var height = $(this.svg).height();
    
    if (this.window_resize_type == 0) {
        VIZ.scale.redraw_size(width / this.old_width, height / this.old_height);
    }
    this.old_width = width;
    this.old_height = height;
};


/** return the pixel width of the SVG times the current scale factor */
VIZ.NetGraph.prototype.get_scaled_width = function() {
    return $(this.svg).width() * this.scale;
}


/** return the pixel height of the SVG times the current scale factor */
VIZ.NetGraph.prototype.get_scaled_height = function() {
    return $(this.svg).height() * this.scale;
}


/** expand or collapse a network */
VIZ.NetGraph.prototype.toggle_network = function(uid) {
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
VIZ.NetGraph.prototype.register_conn = function(conn, target) {
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
VIZ.NetGraph.prototype.detect_collapsed_conns = function(uid) {
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
