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

    this.svg = this.createSVGElement('svg');
    this.svg.classList.add('netgraph');    
    this.svg.style.width = '100%';
    this.svg.style.height = 'calc(100% - 80px)';
    this.svg.style.position = 'fixed';
    args.parent.appendChild(this.svg);
    this.parent = args.parent;
        
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
            
        });
    
    
};

/** Event handler for received WebSocket messages */
VIZ.NetGraph.prototype.on_message = function(event) {
    console.log(event.data);
    data = JSON.parse(event.data);
    if (data.type != 'conn') {
        this.create_object(data);
    }
};  

VIZ.NetGraph.prototype.createSVGElement = function(tag) {
    return document.createElementNS("http://www.w3.org/2000/svg", tag);
}


VIZ.NetGraph.prototype.create_object = function(info) {
    var item = new VIZ.NetGraphItem(this, info);
    this.svg_objects[info.uid] = item;    
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
        item.collapse();
    } else {
        item.expand();
    }
}

VIZ.NetGraphItem = function(ng, info) {
    this.ng = ng;
    this.pos = info.pos;
    this.size = info.size;
    this.type = info.type;
    this.uid = info.uid;
    this.children = [];
    if (info.parent == null) {
        this.parent = null;
    } else {
        this.parent = ng.svg_objects[info.parent];
        this.parent.children.push(this);
    }
    this.expanded = false;
    
    this.minWidth = 5;
    this.minHeight = 5;

    var g = this.ng.createSVGElement('g');
    this.g = g;
    ng.svg.appendChild(g);
    g.classList.add(this.type);
    
    this.set_position(info.pos[0], info.pos[1]);

    if (info.type == 'node') {
        this.shape = this.ng.createSVGElement('rect');
    } else if (info.type == 'net') {
        this.shape = this.ng.createSVGElement('rect');
        this.shape.setAttribute('rx', '15');
        this.shape.setAttribute('ry', '15');
    } else if (info.type == 'ens') {
        this.shape = this.ng.createSVGElement('ellipse');
        this.shape.setAttribute('cx', '0');
        this.shape.setAttribute('cy', '0');
    }
    this.set_size(info.size[0], info.size[1]);
    g.appendChild(this.shape);
    
    var label = this.ng.createSVGElement('text');
    this.label = label;
    label.innerHTML = info.label;
    g.appendChild(label);

    var uid = this.uid;
    var ng = ng;
    interact(g)
        .draggable({
            onmove: function(event) {
                var w = ng.get_scaled_width();
                var h = ng.get_scaled_height();    
                var item = ng.svg_objects[uid];
                var parent = item.parent;
                while (parent != null) {
                    w = w * parent.size[0] * 2;
                    h = h * parent.size[1] * 2;
                    parent = parent.parent;
                }
                item.set_position(item.pos[0] + event.dx/w, item.pos[1] + event.dy/h);
            }});
            
    interact(this.shape)
        .resizable({
            edges: { left: true, right: true, bottom: true, top: true }
            })
        .on('resizemove', function(event) {            
            var item = ng.svg_objects[uid];
            var w = ng.get_scaled_width();
            var h = ng.get_scaled_height();    
            var parent = item.parent;
            while (parent != null) {
                w = w * parent.size[0] * 2;
                h = h * parent.size[1] * 2;
                parent = parent.parent;
            }
            
            item.set_size(item.size[0] + event.deltaRect.width / w / 2, 
                          item.size[1] + event.deltaRect.height / h / 2);
            item.set_position(item.pos[0] + event.deltaRect.width / w / 2 + 
                                            event.deltaRect.left / w, 
                              item.pos[1] + event.deltaRect.height / h / 2 + 
                                            event.deltaRect.top / h);
            });
            
    if (info.type == 'net') {
        interact(this.g)
            .on('tap', function(event) {
                ng.toggle_network(uid);
            });
    }
};

VIZ.NetGraphItem.prototype.expand = function() {
    this.g.classList.add('expanded');
    var screen_h = this.get_nested_height() * $(this.ng.svg).height() * this.ng.scale;
    this.label.setAttribute('transform', 'translate(0, ' + (screen_h) + ')');
    this.expanded = true;
    this.ng.ws.send(JSON.stringify({act:"expand", uid:this.uid}));
}

VIZ.NetGraphItem.prototype.collapse = function() {
    this.g.classList.remove('expanded');
    this.label.setAttribute('transform', '');
    
    while (this.children.length > 0) {
        this.children[0].remove();
    }
    this.expanded = false;        
}


VIZ.NetGraphItem.prototype.remove = function() {
    if (this.expanded) {
        this.collapse();
    }
    if (this.parent != null) {
        var index = this.parent.children.indexOf(this);
        this.parent.children.splice(index, 1);    
    }
    this.ng.svg.removeChild(this.g);
    delete this.ng.svg_objects[this.uid];    
}

VIZ.NetGraphItem.prototype.set_position = function(x, y) {
    var dx = x - this.pos[0];
    var dy = y - this.pos[1];
    
    this.pos = [x, y];
    var w = $(this.ng.svg).width() * this.ng.scale;
    var h = $(this.ng.svg).height() * this.ng.scale;

    var offsetX = this.ng.offsetX * w;
    var offsetY = this.ng.offsetY * h;
    
    var dx = 0;
    var dy = 0;
    var parent = this.parent;
    while (parent != null) {
        dx *= parent.size[0] * 2;
        dy *= parent.size[1] * 2;
        
        dx += (parent.pos[0] - parent.size[0]);
        dy += (parent.pos[1] - parent.size[1]);
        //w = w * parent.size[0] * 2;
        //h = h * parent.size[1] * 2;
        parent = parent.parent;
    }
    dx *= w;
    dy *= h;
    
    var ww = w;
    var hh = h;
    if (this.parent != null) {
        ww *= this.parent.get_nested_width() * 2;
        hh *= this.parent.get_nested_height() * 2;
    }
    
    this.g.setAttribute('transform', 'translate(' + (this.pos[0]*ww+dx+offsetX) + ', ' + (this.pos[1]*hh+dy+offsetY) + ')');
    
    for (var i in this.children) {
        var item = this.children[i];
        item.redraw();
    }
        
};

VIZ.NetGraphItem.prototype.get_nested_width = function() {
    var w = this.size[0];
    var parent = this.parent;
    while (parent != null) {
        w *= parent.size[0] * 2;
        parent = parent.parent;
    }
    return w;
}

VIZ.NetGraphItem.prototype.get_nested_height = function() {
    var h = this.size[1];
    var parent = this.parent;
    while (parent != null) {
        h *= parent.size[1] * 2;
        parent = parent.parent;
    }
    return h;
}

VIZ.NetGraphItem.prototype.set_size = function(width, height) {
    this.size = [width, height];
    var w = $(this.ng.svg).width();
    var h = $(this.ng.svg).height();    
    
    var screen_w = this.get_nested_width() * w * this.ng.scale;
    var screen_h = this.get_nested_height() * h * this.ng.scale;
        
    if (screen_w < this.minWidth) {
        screen_w = this.minWidth;
    }
    if (screen_h < this.minHeight) {
        screen_h = this.minHeight;
    }
    
    if (this.type == 'ens') {
        this.shape.setAttribute('rx', screen_w);
        this.shape.setAttribute('ry', screen_h);    
    } else {
        this.shape.setAttribute('transform', 'translate(-' + screen_w + ', -' + screen_h + ')')
        this.shape.setAttribute('width', screen_w * 2);
        this.shape.setAttribute('height', screen_h * 2);
    }
    
    if (this.expanded) {
        this.label.setAttribute('transform', 'translate(0, ' + screen_h + ')');
    }
    
    for (var i in this.children) {
        var item = this.children[i];
        item.redraw();
    }
    
    
};

VIZ.NetGraphItem.prototype.redraw = function() {
    this.set_position(this.pos[0], this.pos[1]);
    this.set_size(this.size[0], this.size[1]);
}
