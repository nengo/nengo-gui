/**
 * Network diagram individual item (node)
 * @constructor
 *
 * @param {Nengo.NetGraph} ng - The Nengo.NetGraph this Item is inside
 * @param {dict} info - A dictionary of settings for the item, including:
 * @param {float array} info.pos - x,y position
 * @param {float array} info.size - half width, half height of item
 * @param {string} info.type - one of ['net', 'ens', 'node']
 * @param {string} info.uid - unique identifier
 * @param {string or null} info.parent - a NetGraphItem with .type=='net'
 */
Nengo.NetGraphItem = function(ng, info, minimap, mini_item) {
    var self = this;

    this.ng = ng;
    this.pos = info.pos;
    this.size = info.size;
    this.type = info.type;
    this.uid = info.uid;
    this.sp_targets = info.sp_targets;
    this.default_output = info.default_output;
    this.passthrough = info.passthrough;
    this.fixed_width = null;
    this.fixed_height = null;
    this.dimensions = info.dimensions;
    this.minimap = minimap;
    this.html_node = info.html;
    if (minimap == false) {
        this.g_networks = ng.g_networks;
        this.g_items = ng.g_items;
        this.mini_item = mini_item;
    } else {
        this.g_networks = ng.g_networks_mini;
        this.g_items = ng.g_items_mini;
    }

    /** if this is a network, the children list is the set of NetGraphItems
     *  and NetGraphConnections that are inside this network */
    this.children = [];
    this.child_connections = [];

    // NetGraphConnections leading into and out of this item
    this.conn_out = [];
    this.conn_in = [];

    // minimum and maximum drawn size, in pixels
    this.minWidth = 5;
    this.minHeight = 5;
    this.aspect = null;

    this.expanded = false;

    /** determine the parent NetGraphItem (if any) and the nested depth
     *  of this item */
    if (info.parent === null) {
        this.parent = null;
        this.depth = 1;
    } else {
        this.parent = ng.svg_objects[info.parent];
        this.depth = this.parent.depth + 1;
        this.parent.children.push(this);
    }

    /** create the SVG group to hold this item */
    var g = this.ng.createSVGElement('g');
    this.g = g;
    this.g_items.appendChild(g);
    g.classList.add(this.type);

    this.area = this.ng.createSVGElement('rect');
    this.area.style.fill = 'transparent';

    this.menu = new Nengo.Menu(this.ng.parent);

    // different types use different SVG elements for display
    if (info.type === 'node') {
        if (this.passthrough) {
            this.shape = this.ng.createSVGElement('ellipse');
            if (this.minimap == false) {
                this.fixed_width = 10;
                this.fixed_height = 10;
            } else {
                this.fixed_width = 3;
                this.fixed_height = 3;
            }
            this.g.classList.add('passthrough');
        } else {
            this.shape = this.ng.createSVGElement('rect');
        }
    } else if (info.type === 'net') {
        this.shape = this.ng.createSVGElement('rect');
    } else if (info.type === 'ens') {
        this.aspect = 1.;
        this.shape = this.ensemble_svg();
    } else {
        console.log("Unknown NetGraphItem type");
        console.log(item);
    }

    this.compute_fill();

    if (this.minimap == false) {
        var label = this.ng.createSVGElement('text');
        this.label = label;
        label.innerHTML = info.label;
        g.appendChild(label);
    };

    this.set_position(info.pos[0], info.pos[1]);
    this.set_size(info.size[0], info.size[1]);

    g.appendChild(this.shape);
    g.appendChild(this.area);

    interact.margin(10);

    if (this.minimap == false) {
        // dragging an item to change its position
        var uid = this.uid;
        var ng = ng;
        interact(g)
            .draggable({
                onstart: function () {
                    self.menu.hide_any();
                    self.move_to_front();
                },
                onmove: function(event) {
                    var w = ng.get_scaled_width();
                    var h = ng.get_scaled_height();
                    var item = ng.svg_objects[uid];
                    var parent = item.parent;
                    while (parent !== null) {
                        w = w * parent.size[0] * 2;
                        h = h * parent.size[1] * 2;
                        parent = parent.parent;
                    }
                    item.set_position(item.pos[0] + event.dx / w,
                                    item.pos[1] + event.dy / h);

                    var item_mini = ng.minimap_objects[uid];
                    item_mini.set_position(item.pos[0], item.pos[1])
                    item_mini.set_size(item.size[0], item.size[1]);

                    if (self.depth === 1) {
                        self.ng.scaleMiniMap();
                    }
                },
                onend: function(event) {
                    var item = ng.svg_objects[uid];
                    item.constrain_position();
                    ng.notify({act:"pos", uid:uid, x:item.pos[0], y:item.pos[1]});

                    var item_mini = ng.minimap_objects[uid];
                    item_mini.set_position(item.pos[0], item.pos[1])
                    item_mini.set_size(item.size[0], item.size[1]);
                }});

        if (!this.passthrough) {
            // dragging the edge of item to change its size
            var tmp = this.shape
            if(info.type === 'ens') {
                tmp = $(this.shape.getElementsByClassName('mainCircle'))[0];
            }
            interact(this.area)
            .resizable({
                edges: { left: true, right: true, bottom: true, top: true },
                invert: this.type == 'ens' ? 'reposition' : 'none'
                })
                .on('resizestart', function(event) {
                    self.menu.hide_any();
                    })
                .on('resizemove', function(event) {
                    var item = ng.svg_objects[uid];
                    var pos = item.get_screen_location();
                    var h_scale = ng.get_scaled_width();
                    var v_scale = ng.get_scaled_height();
                    var parent = item.parent;
                    while (parent !== null) {
                        h_scale = h_scale * parent.size[0] * 2;
                        v_scale = v_scale * parent.size[1] * 2;
                        parent = parent.parent;
                    }

                    if (self.aspect !== null) {
                        self.constrain_aspect();

                        var vertical_resize = event.edges.bottom || event.edges.top;
                        var horizontal_resize = event.edges.left || event.edges.right;

                        var screen_offset = $('#netgraph').offset();
                        var w = pos[0] - event.clientX + screen_offset.left;
                        var h = pos[1] - event.clientY + screen_offset.top;

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

                        var screen_w = item.size[0] * h_scale;
                        var screen_h = item.size[1] * v_scale;

                        if (horizontal_resize && vertical_resize) {
                            var p = (screen_w * w + screen_h * h) / Math.sqrt(
                                screen_w * screen_w + screen_h * screen_h);
                            var norm = Math.sqrt(self.aspect * self.aspect + 1);
                            h = p / (self.aspect / norm);
                            w = p * (self.aspect / norm);
                        } else if (horizontal_resize) {
                            h = w / self.aspect;
                        } else {
                            w = h * self.aspect;
                        }

                        var scaled_w = w / h_scale;
                        var scaled_h = h / v_scale;

                        item.set_size(scaled_w, scaled_h);
                    } else {
                        var dw = event.deltaRect.width / h_scale / 2;
                        var dh = event.deltaRect.height / v_scale / 2;
                        var offset_x = dw + event.deltaRect.left / h_scale;
                        var offset_y = dh + event.deltaRect.top / v_scale;

                        item.set_size(item.size[0] + dw, item.size[1] + dh);
                        item.set_position(item.pos[0] + offset_x,
                                        item.pos[1] + offset_y);
                    }

                    var item_mini = ng.minimap_objects[uid];
                    item_mini.set_position(item.pos[0], item.pos[1])
                    item_mini.set_size(item.size[0], item.size[1]);

                    if (self.depth === 1) {
                        self.ng.scaleMiniMap();
                    }
                })
                .on('resizeend', function(event) {
                    var item = ng.svg_objects[uid];
                    item.constrain_position();
                    ng.notify({act:"pos_size", uid:uid,
                            x:item.pos[0], y:item.pos[1],
                            width:item.size[0], height:item.size[1]});

                    var item_mini = ng.minimap_objects[uid];
                    item_mini.set_position(item.pos[0], item.pos[1])
                    item_mini.set_size(item.size[0], item.size[1]);
                    });
        }

        // Determine when to pull up the menu
        interact(this.g)
            .on('hold', function(event) { // change to 'tap' for right click
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
            .on('tap', function(event) { // get rid of menus when clicking off
                if (event.button == 0) {
                    if (self.menu.visible_any()) {
                        self.menu.hide_any();
                    }
                }
            })
            .on('doubletap', function(event) { // get rid of menus when clicking off
                if (event.button == 0) {
                    if (self.menu.visible_any()) {
                        self.menu.hide_any();
                    } else if (self.type === 'net') {
                        if (self.expanded) {
                            self.collapse(true);
                        } else {
                            self.expand();
                        }
                    }
                }
            });
        $(this.g).bind('contextmenu', function(event) {
                event.preventDefault();
                event.stopPropagation();
                if (self.menu.visible_any()) {
                    self.menu.hide_any();
                } else {
                    self.menu.show(event.clientX, event.clientY,
                                self.generate_menu());
            }
        });

        if (info.type === 'net') {
            // if a network is flagged to expand on creation, then expand it
            if (info.expanded) {
                // Report to server but do not add to the undo stack
                this.expand(true,true);
            }
        }
    };
};

Nengo.NetGraphItem.prototype.set_label = function(label) {
    this.label.innerHTML = label;
}

Nengo.NetGraphItem.prototype.move_to_front = function() {
    this.g.parentNode.appendChild(this.g);

    for (var item in this.children) {
        this.children[item].move_to_front();
    }
};

Nengo.NetGraphItem.prototype.generate_menu = function () {
    var self = this;
    var items = [];
    if (this.type === 'net') {
        if (this.expanded) {
            items.push(['Collapse network',
                        function() {self.collapse(true);}]);
            items.push(['Auto-layout',
                        function() {self.request_feedforward_layout();}]);
        } else {
            items.push(['Expand network',
                        function() {self.expand();}]);
        }
        if (this.default_output && this.sp_targets.length == 0) {
            items.push(['Output Value',
                        function() {self.create_graph('Value');}]);
        }
    }
    if (this.type == 'ens') {
        items.push(['Value', function() {self.create_graph('Value');}]);
        if (this.dimensions > 1) {
            items.push(['XY-value', function() {self.create_graph('XYValue');}]);
        }
        items.push(['Spikes', function() {self.create_graph('Raster');}]);
        items.push(['Voltages', function() {self.create_graph('Voltage');}]);
        items.push(['Firing pattern', function() {self.create_graph('SpikeGrid');}]);
    }
    if (this.type == 'node') {
        items.push(['Slider', function() {self.create_graph('Slider');}]);
        if (this.dimensions > 0) {
            items.push(['Value', function() {self.create_graph('Value');}]);
        }
        if (this.dimensions > 1) {
            items.push(['XY-value', function() {self.create_graph('XYValue');}]);
        }
        if (this.html_node) {
            items.push(['HTML', function() {self.create_graph('HTMLView');}]);
        }
    }
    if (this.sp_targets.length > 0) {
        items.push(['Semantic pointer cloud',
                    function() {self.create_graph('Pointer', self.sp_targets[0]);}]);
        items.push(['Semantic pointer plot',
            function() {self.create_graph('SpaSimilarity', self.sp_targets[0]);}]);
    }
    items.push(['Details ...', function() {self.create_modal();}]);
    return items;
};

Nengo.NetGraphItem.prototype.create_graph = function (type, args) {
    var info = {};
    info.act = 'create_graph';
    info.type = type;
    var w = this.get_nested_width();
    var h = this.get_nested_height();

    var pos = this.get_screen_location();

    info.x = pos[0] / (viewport.w * viewport.scale) - viewport.x + w;
    info.y = pos[1] / (viewport.h * viewport.scale) - viewport.y + h;

    info.width = 100 / (viewport.w * viewport.scale);
    info.height = 100 / (viewport.h * viewport.scale);

    if (info.type == 'Slider') {
        info.width /= 2;
    }

    info.uid = this.uid;
    if (typeof(args) != 'undefined') { info.args = args; }
    this.ng.notify(info);
};

Nengo.NetGraphItem.prototype.create_modal = function () {
    var info = {};
    info.act = 'create_modal';
    info.uid = this.uid;
    info.conn_in_uids = this.conn_in.map(function (c) { return c.uid; });
    info.conn_out_uids = this.conn_out.map(function (c) { return c.uid; });
    this.ng.notify(info);
}

Nengo.NetGraphItem.prototype.request_feedforward_layout = function () {
    this.ng.notify({act:"feedforward_layout", uid:this.uid});
};

/** expand a collapsed network */
Nengo.NetGraphItem.prototype.expand = function(rts, auto) {
    // default to true if no parameter is specified
    rts = typeof rts !== 'undefined' ? rts : true;
    auto = typeof auto !== 'undefined' ? auto : false;

    this.g.classList.add('expanded');

    if (!this.expanded) {
        this.expanded = true;
        if (this.ng.transparent_nets) {
            this.shape.style["fill-opacity"] = 0.0;
        }
        this.g_items.removeChild(this.g);
        this.g_networks.appendChild(this.g);
        if (this.minimap == false) {
            this.mini_item.expand(rts, auto);
        }
    } else {
        console.log("expanded a network that was already expanded");
        console.log(this);
    }

    if (rts) {
        if (auto) {
            // Update the server, but do not place on the undo stack
            this.ng.notify({act:"auto_expand", uid:this.uid});
        } else {
            this.ng.notify({act:"expand", uid:this.uid});
        }
    }
}

Nengo.NetGraphItem.prototype.set_label_below = function(flag) {
    if (flag && !this.label_below) {
        var screen_h = this.get_height();
        this.label.setAttribute('transform', 'translate(0, ' + (screen_h / 2) + ')');
    } else if (!flag && this.label_below) {
        this.label.setAttribute('transform', '');
    }
}


/** collapse an expanded network */
Nengo.NetGraphItem.prototype.collapse = function(report_to_server, auto) {
    auto = typeof auto !== 'undefined' ? auto : false;
    this.g.classList.remove('expanded');

    // remove child NetGraphItems and NetGraphConnections
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
        if (this.minimap == false) {
            this.mini_item.collapse(report_to_server, auto);
        }
    } else {
        console.log("collapsed a network that was already collapsed");
        console.log(this);
    }

    if (report_to_server) {
        if (auto) {
            // Update the server, but do not place on the undo stack
            this.ng.notify({act:"auto_collapse", uid:this.uid});
        } else {
            this.ng.notify({act:"collapse", uid:this.uid});
        }
    }
}


/** determine the fill color based on the depth */
Nengo.NetGraphItem.prototype.compute_fill = function() {
    var depth = this.ng.transparent_nets ? 1 : this.depth;

    if (!this.passthrough) {
        var fill = Math.round(255 * Math.pow(0.8, depth));
        this.shape.style.fill = 'rgb(' + fill + ',' + fill + ',' + fill + ')';
        var stroke = Math.round(255 * Math.pow(0.8, depth + 2));
        this.shape.style.stroke = 'rgb(' + stroke + ',' + stroke + ',' + stroke + ')';
    }
}


/** remove the item from the graph */
Nengo.NetGraphItem.prototype.remove = function() {
    if (this.expanded) {
        /** collapse the item, but don't tell the server since that would
         *  update the server's config */
        this.collapse(false);
    }

    // remove the item from the parent's children list
    if (this.parent !== null) {
        var index = this.parent.children.indexOf(this);
        this.parent.children.splice(index, 1);
    }

    delete this.ng.svg_objects[this.uid];

    // update any connections into or out of this item
    var conn_in = this.conn_in.slice();
    for (var i in conn_in) {
        var conn = conn_in[i];
        conn.set_post(conn.find_post());
        conn.redraw();
    }
    var conn_out = this.conn_out.slice();
    for (var i in conn_out) {
        var conn = conn_out[i];
        conn.set_pre(conn.find_pre());
        conn.redraw();
    }

    // remove from the SVG
    this.g_items.removeChild(this.g);
    if (this.minimap == true && this.depth == 1) {
        this.ng.scaleMiniMap();
    }
};

Nengo.NetGraphItem.prototype.constrain_aspect = function() {
    this.size = this.get_displayed_size();
};

Nengo.NetGraphItem.prototype.get_displayed_size = function() {
    if (this.aspect !== null) {
        var h_scale = this.ng.get_scaled_width();
        var v_scale = this.ng.get_scaled_height();
        var parent = this.parent;
        while (parent !== null) {
            h_scale = h_scale * parent.size[0] * 2;
            v_scale = v_scale * parent.size[1] * 2;
            parent = parent.parent;
        }

        var w = this.size[0] * h_scale;
        var h = this.size[1] * v_scale;

        if (h * this.aspect < w) {
            w = h * this.aspect;
        } else if (w / this.aspect < h) {
            h = w / this.aspect;
        }

        return [w / h_scale, h / v_scale];
    } else {
        return this.size;
    }
};

Nengo.NetGraphItem.prototype.constrain_position = function() {
    this.constrain_aspect();

    var changed = false;
    if (this.parent !== null) {
        var w = this.size[0];
        var h = this.size[1];

        if (this.size[0] > 0.5) {
            this.size[0] = 0.5;
            changed = true;
        }

        if (this.size[1] > 0.5) {
            this.size[1] = 0.5;
            changed = true;
        }

        if (this.pos[0] + this.size[0] > 1.0) {
            this.pos[0] = 1.0 - this.size[0];
            changed = true;
        } else if (this.pos[0] - this.size[0] < 0.0) {
            this.pos[0] = this.size[0];
            changed = true;
        }
        if (this.pos[1] + this.size[1] > 1.0) {
            this.pos[1] = 1.0 - this.size[1];
            changed = true;
        } else if (this.pos[1] - this.size[1] < 0.0) {
            this.pos[1] = this.size[1];
            changed = true;
        }
    }

    if (changed) {
        this.redraw_position();
        this.redraw_size();

        this.redraw_children();
        this.redraw_child_connections();
        this.redraw_connections();
    }
};


/** set the position of the item and redraw it appropriately */
Nengo.NetGraphItem.prototype.set_position = function(x, y) {

    this.pos = [x, y];

    this.redraw_position();

    this.redraw_children();
    this.redraw_child_connections();
    this.redraw_connections();
};

Nengo.NetGraphItem.prototype.redraw_position = function() {
    var screen = this.get_screen_location();

    // update my position
    this.g.setAttribute('transform', 'translate(' + screen[0] + ', ' +
                                                    screen[1] + ')');
};

Nengo.NetGraphItem.prototype.redraw_children = function() {
    // update any children's positions
    for (var i in this.children) {
        var item = this.children[i];
        item.redraw();
    }
};

Nengo.NetGraphItem.prototype.redraw_child_connections = function() {
    // update any children's positions
    for (var i in this.child_connections) {
        var item = this.child_connections[i];
        item.redraw();
    }
};


Nengo.NetGraphItem.prototype.redraw_connections = function() {
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
Nengo.NetGraphItem.prototype.get_nested_width = function() {
    var w = this.size[0];
    var parent = this.parent;
    while (parent !== null) {
        w *= parent.size[0] * 2;
        parent = parent.parent;
    }
    return w;
}

/** return the height of the item, taking into account parent heights */
Nengo.NetGraphItem.prototype.get_nested_height = function() {
    var h = this.size[1];
    var parent = this.parent;
    while (parent !== null) {
        h *= parent.size[1] * 2;
        parent = parent.parent;
    }
    return h;
}


/** set the size of the item, updating SVG as appropriate */
Nengo.NetGraphItem.prototype.set_size = function(width, height) {
    this.size = [width, height];

    this.redraw_size();

    this.redraw_children();
    this.redraw_child_connections();
    this.redraw_connections();
};

Nengo.NetGraphItem.prototype.redraw_size = function() {
    var screen_w = this.get_width();
    var screen_h = this.get_height();

    if (this.aspect !== null) {
        if (screen_h * this.aspect < screen_w) {
            screen_w = screen_h * this.aspect;
        } else if (screen_w / this.aspect < screen_h) {
            screen_h = screen_w / this.aspect;
        }
    }

    // the circle pattern isn't perfectly square, so make its area smaller
    var area_w = this.type === 'ens' ? screen_w * 0.97 : screen_w;
    var area_h = screen_h;
    this.area.setAttribute('transform',
            'translate(-' + (area_w / 2) + ', -' + (area_h / 2) + ')');
    this.area.setAttribute('width', area_w);
    this.area.setAttribute('height', area_h);

    if (this.type === 'ens') {
        var scale = Math.sqrt(screen_h * screen_h + screen_w * screen_w) / Math.sqrt(2);
        var r = 17.8;  //TODO: Don't hardcode the size of the ensemble
        this.shape.setAttribute('transform', 'scale(' + scale / 2 / r + ')');
        this.shape.style.setProperty('stroke-width', 20/scale);
    } else if (this.passthrough) {
        this.shape.setAttribute('rx', screen_w / 2);
        this.shape.setAttribute('ry', screen_h / 2);
    } else {
        this.shape.setAttribute('transform',
                            'translate(-' + (screen_w / 2) + ', -' + (screen_h / 2) + ')');
        this.shape.setAttribute('width', screen_w);
        this.shape.setAttribute('height', screen_h);
        if (this.type === 'node') {
            var radius = Math.min(screen_w, screen_h);
            // TODO: Don't hardcode .1 as the corner radius scale
            this.shape.setAttribute('rx', radius*.1);
            this.shape.setAttribute('ry', radius*.1);
        }
    }

    if (this.minimap == false) {
        this.label.setAttribute('transform', 'translate(0, ' + (screen_h / 2) + ')');
    };
};

Nengo.NetGraphItem.prototype.get_width = function() {
    if (this.fixed_width !== null) {
        return this.fixed_width;
    }


    if (this.minimap == false) {
        var w = $(this.ng.svg).width();
        var screen_w = this.get_nested_width() * w * this.ng.scale;
    } else {
        var w = $(this.ng.minimap).width();
        var screen_w = this.get_nested_width() * w * this.ng.mm_scale;
    };

    if (screen_w < this.minWidth) {
        screen_w = this.minWidth;
    }

    return screen_w * 2;
}

Nengo.NetGraphItem.prototype.get_height = function() {
    if (this.fixed_height !== null) {
        return this.fixed_height;
    }

    if (this.minimap == false) {
        var h = $(this.ng.svg).height();
        var screen_h = this.get_nested_height() * h * this.ng.scale;
    } else {
        var h = $(this.ng.minimap).height();
        var screen_h = this.get_nested_height() * h * this.ng.mm_scale;
    };

    if (screen_h < this.minHeight) {
        screen_h = this.minHeight;
    }

    return screen_h * 2;
}


/** force a redraw of the item */
Nengo.NetGraphItem.prototype.redraw = function() {
    this.set_position(this.pos[0], this.pos[1]);
    this.set_size(this.size[0], this.size[1]);
}


/** determine the pixel location of the centre of the item */
Nengo.NetGraphItem.prototype.get_screen_location = function() {
    // FIXME this should probably use this.ng.get_scaled_width and this.ng.get_scaled_height
    if (this.minimap == false) {
        var w = $(this.ng.svg).width() * this.ng.scale;
        var h = $(this.ng.svg).height() * this.ng.scale;

        var offsetX = this.ng.offsetX * w;
        var offsetY = this.ng.offsetY * h;
    } else {
        var mm_w = $(this.ng.minimap).width();
        var mm_h = $(this.ng.minimap).height();

        var w = mm_w * this.ng.mm_scale;
        var h = mm_h * this.ng.mm_scale;

        var disp_w = (this.ng.mm_max_x - this.ng.mm_min_x) * w;
        var disp_h = (this.ng.mm_max_y - this.ng.mm_min_y) * h;

        var offsetX = -this.ng.mm_min_x * w + (mm_w - disp_w) / 2.;
        var offsetY = -this.ng.mm_min_y * h + (mm_h - disp_h) / 2.;
    };

    var dx = 0;
    var dy = 0;
    var parent = this.parent;
    while (parent !== null) {
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
    if (this.parent !== null) {
        ww *= this.parent.get_nested_width() * 2;
        hh *= this.parent.get_nested_height() * 2;
    }

    return [this.pos[0] * ww + dx + offsetX,
            this.pos[1] * hh + dy + offsetY];
}

/**Function for drawing ensemble svg*/
Nengo.NetGraphItem.prototype.ensemble_svg = function() {
    var shape = this.ng.createSVGElement('g');
    shape.setAttribute('class', 'ensemble');

    var dx = -1.25;
    var dy = 0.25;

    var circle = this.ng.createSVGElement('circle');
    this.setAttributes(circle, {'cx':-11.157 + dx,'cy':-7.481 + dy,'r':'4.843'});
    shape.appendChild(circle);
    var circle = this.ng.createSVGElement('circle');
    this.setAttributes(circle, {'cx':0.186 + dx,'cy':-0.127 + dy,'r':'4.843'});
    shape.appendChild(circle);
    var circle = this.ng.createSVGElement('circle');
    this.setAttributes(circle, {'cx':5.012 + dx,'cy':12.56 + dy,'r':'4.843'});
    shape.appendChild(circle);
    var circle = this.ng.createSVGElement('circle');
    this.setAttributes(circle, {'cx':13.704 + dx,'cy':-0.771 + dy,'r':'4.843'});
    shape.appendChild(circle);
    var circle = this.ng.createSVGElement('circle');
    this.setAttributes(circle, {'cx':-10.353 + dx,'cy':8.413 + dy,'r':'4.843'});
    shape.appendChild(circle);
    var circle = this.ng.createSVGElement('circle');
    this.setAttributes(circle, {'cx':3.894 + dx,'cy':-13.158 + dy,'r':'4.843'});
    shape.appendChild(circle);

    return shape;
}
/** Helper function for setting attributions*/
Nengo.NetGraphItem.prototype.setAttributes = function(el, attrs) {
  for(var key in attrs) {
    el.setAttribute(key, attrs[key]);
  }
}

Nengo.NetGraphItem.prototype.getMinMaxXY = function () {
    min_x = this.pos[0] - this.size[0];
    max_x = this.pos[0] + this.size[0];
    min_y = this.pos[1] - this.size[1];
    max_y = this.pos[1] + this.size[1];
    return [min_x, max_x, min_y, max_y];
}
