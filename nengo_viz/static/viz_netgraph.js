/**
 * Network diagram
 * @constructor
 *
 * @param {dict} args - A set of constructor arguments, including:
 * @param {int} args.id - the id of the server-side NetGraph to connect to
 * @param {DOMElement} args.parent - the element to add this component to
 */
VIZ.NetGraph = function(args) {

    /** create the master SVG element */
    this.svg = this.createSVGElement('svg');
    this.svg.classList.add('netgraph');    
    this.svg.style.width = '100%';
    this.svg.style.height = 'calc(100% - 80px)';
    this.svg.style.position = 'fixed';
    args.parent.appendChild(this.svg);
    this.parent = args.parent;
    
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
    this.ws = new WebSocket('ws://localhost:8080/viz_component?id=' + args.id);
    this.ws.binaryType = "arraybuffer";
    this.ws.onmessage = function(event) {self.on_message(event);}

    /** respond to resize events */
    this.svg.addEventListener("resize", function() {self.on_resize();});
    window.addEventListener("resize", function() {self.on_resize();});
    
    this.scale = 1.0;          // global scaling factor
    this.offsetX = 0;          // global x,y pan offset 
    this.offsetY = 0;

    this.svg_objects = {};     // dict of all VIZ.NetGraphItems, by uid
    this.svg_conns = {};       // dict of all VIZ.NetGraphConnections, by uid

    /** Since connections may go to items that do not exist yet (since they
     *  are inside a collapsed network), this dictionary keeps a list of
     *  connections to be notified when a particular item appears.  The
     *  key in the dictionary is the uid of the nonexistent item, and the
     *  value is a list of VIZ.NetGraphConnections that should be notified
     *  when that item appears. */
    this.collapsed_conns = {}; 
    
    /** dragging the background pans the full area by changing offsetX,Y */
    var self = this;
    interact(this.svg)
        .draggable({
            onmove: function(event) {
                self.offsetX += event.dx / self.get_scaled_width();
                self.offsetY += event.dy / self.get_scaled_height();
                for (var key in self.svg_objects) {
                    self.svg_objects[key].redraw();
                }    
            },
            onend: function(event) {
                /** let the server know what happened */
                self.notify({act:"pan", x:self.offsetX, y:self.offsetY});
            }});

    /** scrollwheel on background zooms the full area by changing scale.
     *  Note that offsetX,Y are also changed to zoom into a particular
     *  point in the space */
    interact(this.svg)
        .on('wheel', function(event) {
            var x = (event.clientX / $(self.svg).width());
            var y = (event.clientY / $(self.svg).height());

            var step_size = 1.1; // size of zoom per wheel click

            var delta = event.wheelDeltaY || -event.deltaY
            var scale = delta > 0 ? step_size : 1.0 / step_size;
            
            var w = self.get_scaled_width(); 
            var h = self.get_scaled_height();
            var dw = w * scale - w;
            var dh = h * scale - h;
            
            // TODO: this math is not quite right
            self.offsetX = self.offsetX / scale - dw * x / (w * scale);
            self.offsetY = self.offsetY / scale - dh * y / (h * scale);
                    
            self.scale = scale * self.scale;

            self.redraw();

            /** let the server know what happened */
            self.notify({act:"zoom", scale:self.scale, 
                         x:self.offsetX, y:self.offsetY});
        });
};


/** Event handler for received WebSocket messages */
VIZ.NetGraph.prototype.on_message = function(event) {
    data = JSON.parse(event.data);
    if (data.type == 'net') {
        this.create_object(data);
    } else if (data.type == 'ens') {
        this.create_object(data);
    } else if (data.type == 'node') {
        this.create_object(data);
    } else if (data.type == 'conn') {
        this.create_connection(data);
    } else if (data.type == 'pan') {
        this.set_offset(data.pan[0], data.pan[1]);
    } else if (data.type == 'zoom') {
        this.set_scale(data.zoom);
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
}


/** zoom the screen (and redraw accordingly) */
VIZ.NetGraph.prototype.set_scale = function(scale) {
    this.scale = scale;
    this.redraw();
}


/** redraw all elements */
VIZ.NetGraph.prototype.redraw = function() {
    for (var key in this.svg_objects) {
        this.svg_objects[key].redraw();
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
    this.redraw();
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
        this.collapsed_conns[target].push(conn);
    }
}


/** if a NetGraphConnection is looking for an item with a particular uid,
 *  but that item does not exist yet (due to it being inside a collapsed
 *  network), then it is added to the collapsed_conns dicutionary.  When
 *  an item is create, this function is used to see if any NetGraphConnections
 *  are waiting for it, and notifies them. */
VIZ.NetGraph.prototype.detect_collapsed_conns = function(uid) {
    var conns = this.collapsed_conns[uid];
    if (conns != undefined) {
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
