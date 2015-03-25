/**
 * Network diagram
 * @constructor
 *
 * @param {dict} args - A set of constructor arguments, including:
 * @param {int} args.id - the id of the server-side NetGraph to connect to
 * @param {DOMElement} args.parent - the element to add this component to
 */
VIZ.NetGraph = function(args) {
    var self = this;

    n = this;

    this.svg = this.createSVGElement('svg');
    this.svg.classList.add('netgraph');    
    this.svg.style.width = '100%';
    this.svg.style.height = 'calc(100% - 80px)';
    this.svg.style.position = 'fixed';
    args.parent.appendChild(this.svg);
    this.parent = args.parent;
    
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
    
    this.scale = 1.0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.svg_objects = {};
    this.svg_conns = {};
    this.collapsed_conns = {};
    
    var self = this;
    interact(this.svg)
        .draggable({
            onmove: function(event) {
                var w = self.get_scaled_width();
                var h = self.get_scaled_height(); 
                var dx = event.dx / w;
                var dy = event.dy / h;
                self.offsetX += dx;
                self.offsetY += dy;
                for (var key in self.svg_objects) {
                    self.svg_objects[key].redraw();
                }    
            },
            onend: function(event) {
                self.ws.send(JSON.stringify({act:"pan", x:self.offsetX,
                                                        y:self.offsetY}));
            }});
    
    interact(this.svg)
        .on('wheel', function(event) {
            var x = (event.clientX / $(self.svg).width());
            var y = (event.clientY / $(self.svg).height());
            var step_size = 1.1;
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
            for (var key in self.svg_objects) {
                self.svg_objects[key].redraw();
            }    
            self.ws.send(JSON.stringify({act:"zoom", scale:self.scale, 
                                         x:self.offsetX, y:self.offsetY}));
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

VIZ.NetGraph.prototype.set_offset = function(x, y) {
    this.offsetX = x;
    this.offsetY = y;
    this.redraw();
}

VIZ.NetGraph.prototype.set_scale = function(scale) {
    this.scale = scale;
    this.redraw();
}

VIZ.NetGraph.prototype.redraw = function() {
    for (var key in this.svg_objects) {
        this.svg_objects[key].redraw();
    }    
}


VIZ.NetGraph.prototype.createSVGElement = function(tag) {
    return document.createElementNS("http://www.w3.org/2000/svg", tag);
}


VIZ.NetGraph.prototype.create_object = function(info) {
    var item = new VIZ.NetGraphItem(this, info);
    this.svg_objects[info.uid] = item;    
    this.detect_collapsed_conns(item.uid);
};

VIZ.NetGraph.prototype.create_connection = function(info) {
    var conn = new VIZ.NetGraphConnection(this, info);
    this.svg_conns[info.uid] = conn;    
};

VIZ.NetGraph.prototype.on_resize = function(event) {
    for (var key in this.svg_objects) {
        var item = this.svg_objects[key];
        item.set_position(item.pos[0], item.pos[1]);
        item.set_size(item.size[0], item.size[1]);
    }
};

VIZ.NetGraph.prototype.get_scaled_width = function() {
    return $(this.svg).width() * this.scale;
}
VIZ.NetGraph.prototype.get_scaled_height = function() {
    return $(this.svg).height() * this.scale;
}

VIZ.NetGraph.prototype.toggle_network = function(uid) {
    var item = this.svg_objects[uid];
    if (item.expanded) {
        item.collapse(true);
    } else {
        item.expand();
    }
}

VIZ.NetGraph.prototype.register_conn = function(conn, target) {
    if (this.collapsed_conns[target] === undefined) {
        this.collapsed_conns[target] = [conn];
    } else {
        this.collapsed_conns[target].push(conn);
    }
}
VIZ.NetGraph.prototype.detect_collapsed_conns = function(uid) {
    var conns = this.collapsed_conns[uid];
    if (conns != undefined) {
        delete this.collapsed_conns[uid];
        for (var i in conns) {
            var conn = conns[i];
            if (!conn.removed) {
                conn.set_pre(conn.find_pre());
                conn.set_post(conn.find_post());
                conn.redraw();
            }
        }
    }
}
