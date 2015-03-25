/**
 * Network diagram individual item (node)
 * @constructor
 *
 * @param {VIZ.NetGraph} ng - The VIZ.NetGraph this Item is inside
 * @param {dict} info - A dictionary of settings for the item, including:
 * @param {float array} info.pos - x,y position
 * @param {float array} info.size - half width, half height of item
 * @param {string} info.type - one of ['net', 'ens', 'node']
 * @param {string} info.uid - unique identifier
 * @param {string or null} info.parent - a NetGraphItem with .type=='net'
 */
VIZ.NetGraphItem = function(ng, info) {
    this.ng = ng;
    this.pos = info.pos;
    this.size = info.size;
    this.type = info.type;
    this.uid = info.uid;

    /** if this is a network, the children list is the set of NetGraphItems
     *  and NetGraphConnections that are inside this network */
    this.children = [];

    /** NetGraphConnections leading into and out of this item */
    this.conn_out = [];
    this.conn_in = [];

    /** determine the parent NetGraphItem (if any) and the nested depth
     *  of this item */
    if (info.parent == null) {
        this.parent = null;
        this.depth = 1;
    } else {
        this.parent = ng.svg_objects[info.parent];
        this.depth = this.parent.depth + 1;
        this.parent.children.push(this);
    }
    this.expanded = false;
    
    /** minimum and maximum drawn size, in pixels */
    this.minWidth = 5;
    this.minHeight = 5;

    /** create the SVG group to hold this item */
    var g = this.ng.createSVGElement('g');
    this.g = g;
    ng.g_items.appendChild(g);    
    g.classList.add(this.type);
    
    /** different types use different SVG elements for display */
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
    } else {
        console.log("Unknown NetGraphItem type");
        console.log(item);
    }

    this.compute_fill();

    this.set_position(info.pos[0], info.pos[1]);
    this.set_size(info.size[0], info.size[1]);

    g.appendChild(this.shape);
    
    var label = this.ng.createSVGElement('text');
    this.label = label;
    label.innerHTML = info.label;
    g.appendChild(label);

    /** dragging an item to change its position */
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
                item.set_position(item.pos[0] + event.dx / w, 
                                  item.pos[1] + event.dy / h);
            }});
            
    /** dragging the edge of item to change its size */
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
        /** tap to expand or collapse a network */
        interact(this.g)
            .on('tap', function(event) {
                ng.toggle_network(uid);
            });

        /** if a network is flagged to expand on creation, then expand it */
        if (info.expanded) {
            this.expand();
        }
    }

};


/** expand a collapsed network */
VIZ.NetGraphItem.prototype.expand = function() {
    this.g.classList.add('expanded');
    var screen_h = this.get_nested_height() * 
                   $(this.ng.svg).height() * this.ng.scale;

    /** move the label to the bottom */
    this.label.setAttribute('transform', 'translate(0, ' + (screen_h) + ')');

    if (!this.expanded) {
        this.expanded = true;
        this.ng.g_items.removeChild(this.g);
        this.ng.g_networks.appendChild(this.g);
    } else {
        console.log("expanded a network that was already expanded");
        console.log(this);
    }
    this.ng.notify({act:"expand", uid:this.uid});
}


/** collapse an expanded network */
VIZ.NetGraphItem.prototype.collapse = function(report_to_server) {
    this.g.classList.remove('expanded');

    /** move the label back to the middle */
    this.label.setAttribute('transform', '');
    
    /** remove child NetGraphItems and NetGraphConnections */
    while (this.children.length > 0) {
        this.children[0].remove();
    }

    if (this.expanded) {
        this.expanded = false;
        this.ng.g_networks.removeChild(this.g);
        this.ng.g_items.appendChild(this.g);
    } else {
        console.log("collapsed a network that was already collapsed");
        console.log(this);
    }
    
    if (report_to_server) {    
        this.ng.notify({act:"collapse", uid:this.uid});
    }
}


/** determine the fill color based on the depth */
VIZ.NetGraphItem.prototype.compute_fill = function() {
    var fill = Math.round(255 * Math.pow(0.8, this.depth));
    this.shape.style.fill = 'rgb(' + fill + ',' + fill + ',' + fill + ')';
}


/** remove the item from the graph */
VIZ.NetGraphItem.prototype.remove = function() {
    if (this.expanded) {
        /** collapse the item, but don't tell the server since that would
         *  update the server's config */
        this.collapse(false);
    }

    /** remove the item from the parent's children list */
    if (this.parent != null) {
        var index = this.parent.children.indexOf(this);
        this.parent.children.splice(index, 1);    
    }

    delete this.ng.svg_objects[this.uid];    

    /** update any connections into or out of this item */
    for (var i in this.conn_in) {
        var conn = this.conn_in[i];
        conn.set_post(conn.find_post());
        conn.redraw();
    }
    for (var i in this.conn_out) {
        var conn = this.conn_out[i];
        conn.set_pre(conn.find_pre());
        conn.redraw();
    }

    /** remove from the SVG */
    this.ng.g_items.removeChild(this.g);    
}


/** set the position of the item and redraw it appropriately*/
VIZ.NetGraphItem.prototype.set_position = function(x, y) {
    if (x!=this.pos[0] || y!=this.pos[1]) {
        this.ng.notify({act:"pos", uid:this.uid, x:x, y:y});
    }
    
    this.pos = [x, y];

    var screen = this.get_screen_location();
    
    /** update my position */
    this.g.setAttribute('transform', 'translate(' + screen[0] + ', ' + 
                                                    screen[1] + ')');
    
    /** update any children's positions */
    for (var i in this.children) {
        var item = this.children[i];
        item.redraw();
    }

    /** update any connections into and out of this */
    for (var i in this.conn_in) {
        var item = this.conn_in[i];
        item.redraw();
    }
    for (var i in this.conn_out) {
        var item = this.conn_out[i];
        item.redraw();
    }
};


/** return the width of the item, taking into account parent widths */
VIZ.NetGraphItem.prototype.get_nested_width = function() {
    var w = this.size[0];
    var parent = this.parent;
    while (parent != null) {
        w *= parent.size[0] * 2;
        parent = parent.parent;
    }
    return w;
}

/** return the height of the item, taking into account parent heights */
VIZ.NetGraphItem.prototype.get_nested_height = function() {
    var h = this.size[1];
    var parent = this.parent;
    while (parent != null) {
        h *= parent.size[1] * 2;
        parent = parent.parent;
    }
    return h;
}


/** set the size of the item, updating SVG as appropriate */
VIZ.NetGraphItem.prototype.set_size = function(width, height) {
    if (width!=this.size[0] || height!=this.size[1]) {
        this.ng.notify({act:"size", uid:this.uid, width:width, height:height});
    }
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
        this.shape.setAttribute('transform', 
                            'translate(-' + screen_w + ', -' + screen_h + ')');
        this.shape.setAttribute('width', screen_w * 2);
        this.shape.setAttribute('height', screen_h * 2);
    }
    
    if (this.expanded) {
        /** put the label at the bottom */
        this.label.setAttribute('transform', 'translate(0, ' + screen_h + ')');
    }
    
    /** update any children */
    for (var i in this.children) {
        var item = this.children[i];
        item.redraw();
    }
};


/** force a redraw of the item */
VIZ.NetGraphItem.prototype.redraw = function() {
    this.set_position(this.pos[0], this.pos[1]);
    this.set_size(this.size[0], this.size[1]);
}


/** determine the pixel location of the centre of the item */
VIZ.NetGraphItem.prototype.get_screen_location = function() {
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

    return [this.pos[0] * ww + dx + offsetX, 
            this.pos[1] * hh + dy + offsetY];
}
