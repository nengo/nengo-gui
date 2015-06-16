/** namespace for all Nengo visualization */
var Nengo = {};

Nengo.user_settings = [];

Nengo.max_zindex = 0;

/**
 * Helper function to clip a number, keeping it between two values.
 */
Nengo.clip = function(x, low, high) {
    if (x < low) {
        x = low;
    }
    if (x > high) {
        x = high;
    }
    return x;
}

/**
 * Helper function to set the transform of an element.
 */
Nengo.set_transform = function(element, x, y) {
    element.style.webkitTransform =
        element.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
}


Nengo.get_transform = function(element) {
    if ($(element).css('transform') === undefined) {
       var target = '-webkit-transform';
    } else {
       var target = 'transform';
    }
    //Ugly method of finding the current transform of the element
    var holde = $(element).css(target).match(/(-?[0-9\.]+)/g);
    return {x:Number(holde[4]), y:Number(holde[5])};
}

/**
 * Create a WebSocket connection to the given id
 */
Nengo.create_websocket = function(uid) {
    var parser = document.createElement('a');
    parser.href = document.URL;
    var ws_url = 'ws://' + parser.host + '/viz_component?uid=' + uid;
    var ws = new WebSocket(ws_url);
    ws.binaryType = "arraybuffer";
    return ws;
};


/**
 * Base class for interactive visualization
 * @constructor
 *
 * @param {dict} args - A set of constructor arguments, including:
 * @param {DOMElement} args.parent - the element to add this component to
 * @param {float} args.x - the left side of the component (in pixels)
 * @param {float} args.y - the top of the component (in pixels)
 * @param {float} args.width - the width of the component (in pixels)
 * @param {float} args.height - the height of the component (in pixels)
 * @param {boolean} args.label_visible - whether the label should be shown
 * @param {int} args.id - the id of the server-side component to connect to
 */
Nengo.Component = function(parent, args) {
    var self = this;

    this.viewport = viewport;

    /** Create the div for the component and position it */
    this.div = document.createElement('div');

    /** Prevent interact from messing up cursor */
    interact(this.div).styleCursor(true);

    this.x = args.x;
    this.y = args.y;
    this.w = args.width;
    this.h = args.height;

    this.redraw_size();
    this.redraw_pos();

    this.div.style.position = 'fixed';
    this.div.classList.add('graph');
    parent.appendChild(this.div);
    this.parent = parent;

    this.label = document.createElement('div');
    this.label.classList.add('label', 'unselectable');
    this.label.innerHTML = args.label.replace('<', '&lt;').replace('>', '&gt;');
    this.label.style.position = 'fixed';
    this.label.style.width = args.width;
    this.label.style.height = '2em';
    this.label_visible = true;
    this.div.appendChild(this.label);
    if (args.label_visible === false) {
        this.hide_label();
    }

    self.minWidth = 2;
    self.minHeight = 2;

    /** Move element to be drawn on top when clicked on */

    this.div.onmousedown = function() {
        this.style.zIndex = Nengo.next_zindex();
    };

    this.div.ontouchstart = this.div.onmousedown;

    /** Allow element to be dragged */
    interact(this.div)
        .draggable({
            inertia: true,
            onstart: function () {
                self.menu.hide_any();
            },
            onmove: function (event) {
                var target = event.target;

                self.x = self.x + event.dx / (self.viewport.w * self.viewport.scale);
                self.y = self.y + event.dy / (self.viewport.h * self.viewport.scale);

                self.redraw_pos();

            },
            onend: function (event) {
                self.save_layout();
            }
        })

    /** Allow element to be resized */
    interact(this.div)
        .resizable({
            edges: { left: true, top: true, right: true, bottom: true }
            })
        .on('resizestart', function (event) {
            self.menu.hide_any();
        })
        .on('resizemove', function(event) {
            var target = event.target;
            var newWidth = event.rect.width;
            var newHeight = event.rect.height;
            var dx = event.deltaRect.left ;
            var dy = event.deltaRect.top ;
            var dz = event.deltaRect.right;
            var da = event.deltaRect.bottom;

            self.x += (dx + dz) / 2 / (viewport.w * viewport.scale);
            self.y += (dy + da) / 2 / (viewport.h * viewport.scale);

            self.w = newWidth / (viewport.w * viewport.scale) / 2;
            self.h = newHeight / (viewport.h * viewport.scale) / 2;

            self.on_resize(newWidth, newHeight);
            self.redraw_size();
            self.redraw_pos();
        })
        .on('resizeend', function(event) {
            self.save_layout();
        });

    /** Open a WebSocket to the server */
    this.uid = args.uid;
    if (this.uid != undefined) {
        this.ws = Nengo.create_websocket(this.uid);
        this.ws.onmessage = function(event) {self.on_message(event);}
    }

    /** flag whether there is a scheduled update that hasn't happened yet */
    this.pending_update = false;

    this.menu = new Nengo.Menu(self.parent);
    interact(this.div)
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
    $(this.div).bind('contextmenu', function(event) {
            event.preventDefault();
            event.stopPropagation();
            if (self.menu.visible_any()) {
                self.menu.hide_any();
            } else {
                self.menu.show(event.clientX, event.clientY,
                               self.generate_menu());
        }
    });

    Nengo.Component.components.push(this);
};

Nengo.Component.components = [];
Nengo.Component.save_components = function() {
    for (var index in Nengo.Component.components) {
        Nengo.Component.components[index].save_layout();
    }
};

/**
 * Method to be called when Component is resized
 */
Nengo.Component.prototype.on_resize = function(width, height) {};

/**
 * Method to be called when Component received a WebSocket message
 */
Nengo.Component.prototype.on_message = function(event) {};


Nengo.Component.prototype.generate_menu = function() {
    var self = this;
    var items = [];
    if (this.label_visible) {
        items.push(['Hide label', function() {
            self.hide_label();
            self.save_layout();
        }]);
    } else {
        items.push(['Show label', function() {
            self.show_label();
            self.save_layout();
        }]);
    }
    items.push(['Remove', function() {self.remove();}]);
    return items;
};

Nengo.Component.prototype.remove = function(undo_flag) {
    undo_flag = typeof undo_flag !== 'undefined' ? undo_flag : false;

    if (undo_flag === true) {
        this.ws.send('remove_undo');
    } else {
        this.ws.send('remove');
    }
    this.parent.removeChild(this.div);
    var index = Nengo.Component.components.indexOf(this);
    Nengo.Component.components.splice(index, 1);
}


/**
 * Schedule update() to be called in the near future.  If update() is already
 * scheduled, then do nothing.  This is meant to limit how fast update() is
 * called in the case that we are changing the data faster than whatever
 * processing is needed in update()
 */
Nengo.Component.prototype.schedule_update = function(event) {
    if (this.pending_update == false) {
        this.pending_update = true;
        var self = this;
        window.setTimeout(
            function() {
                self.pending_update = false;
                self.update()
            }, 10);
    }
}

/**
 * Do any visual updating that is needed due to changes in the underlying data
 */
Nengo.Component.prototype.update = function(event) {
}

Nengo.Component.prototype.hide_label = function(event) {
    if (this.label_visible) {
        this.label.style.display = 'none';
        this.label_visible = false;
    }
}

Nengo.Component.prototype.show_label = function(event) {
    if (!this.label_visible) {
        this.label.style.display = 'inline';
        this.label_visible = true;
    }
}


Nengo.Component.prototype.layout_info = function () {
    var info = {};
    info.x = this.x;
    info.y = this.y;
    info.width = this.w;
    info.height = this.h;
    info.label_visible = this.label_visible;
    return info;
}

Nengo.Component.prototype.save_layout = function () {
    var info = this.layout_info();
    this.ws.send('config:' + JSON.stringify(info));
}

Nengo.Component.prototype.update_layout = function (config) {
    this.w = config.width;
    this.h = config.height;
    this.x = config.x;
    this.y = config.y;

    this.redraw_size();
    this.redraw_pos();
    this.on_resize(this.get_screen_width(), this.get_screen_height());

    if (config.label_visible === true) {
        this.show_label();
    } else {
        this.hide_label();
    }
}


Nengo.Component.prototype.redraw_size = function () {
    this.width = this.viewport.w * this.w * this.viewport.scale * 2;
    this.height = this.viewport.h * this.h * this.viewport.scale * 2;
    this.div.style.width = this.width;
    this.div.style.height = this.height;
};

Nengo.Component.prototype.redraw_pos = function () {
    var x = (this.x + this.viewport.x - this.w) * this.viewport.w * this.viewport.scale;
    var y = (this.y + this.viewport.y - this.h) * this.viewport.h * this.viewport.scale;
    Nengo.set_transform(this.div, x, y);
};

Nengo.Component.prototype.get_screen_width = function () {
    return this.viewport.w * this.w * this.viewport.scale * 2
};
Nengo.Component.prototype.get_screen_height = function () {
    return this.viewport.h * this.h * this.viewport.scale * 2
};



/**
 * Storage of a set of data points and associated times.
 * @constructor
 *
 * @param {int} dims - number of data points per time
 * @param {Nengo.SimControl} sim - the simulation controller
 * @param {float} synapse - the filter to apply to the data
 */
Nengo.DataStore = function(dims, sim, synapse) {
    this.synapse = synapse; /** TODO: get from Nengo.SimControl */
    this.sim = sim;
    this.times = []
    this.data = [];
    for (var i=0; i < dims; i++) {
        this.data.push([]);
    }
}

/**
 * Add a set of data.
 * @param {array} row - dims+1 data points, with time as the first one
 */
Nengo.DataStore.prototype.push = function(row) {
    /** if you get data out of order, wipe out the later data */
    if (row[0] < this.times[this.times.length - 1]) {
        var index = 0;
        while (this.times[index] < row[0]) {
            index += 1;
        }

        var dims = this.data.length;
        this.times.splice(index, this.times.length);
        for (var i=0; i < this.data.length; i++) {
            this.data[i].splice(index, this.data[i].length);
        }
    }


    /** compute lowpass filter (value = value*decay + new_value*(1-decay) */
    var decay = 0.0;
    if ((this.times.length != 0) && (this.synapse > 0)) {
        var dt = row[0] - this.times[this.times.length - 1];
        decay = Math.exp(-dt / this.synapse);
    }


    /** put filtered values into data array */
    for (var i = 0; i < this.data.length; i++) {
        if (decay == 0.0) {
            this.data[i].push(row[i + 1]);
        } else {
            this.data[i].push(row[i + 1] * (1-decay) +
                              this.data[i][this.data[i].length - 1] * decay);
        }
    }
    /** store the time as well */
    this.times.push(row[0]);
};

/**
 * Reset the data storage.  This will clear current data so there is
 * nothing to display on a reset event.
 */
Nengo.DataStore.prototype.reset = function() {
    var index = 0;
    var dims = this.data.length;
    this.times.splice(index, this.times.length);
    for (var i=0; i < this.data.length; i++) {
        this.data[i].splice(index, this.data[i].length);
    }
}

/**
 * update the data storage.  This should be call periodically (before visual
 * updates, but not necessarily after every push()).  Removes old data outside
 * the storage limit set by the Nengo.SimControl.
 */
Nengo.DataStore.prototype.update = function() {
    /** figure out how many extra values we have (values whose time stamp is
     * outside the range to keep)
     */
    var extra = 0;
    var limit = this.sim.time_slider.last_time -
                this.sim.time_slider.kept_time;
    while (this.times[extra] < limit) {
        extra += 1;
    }

    /** remove the extra data */
    if (extra > 0) {
        this.times = this.times.slice(extra);
        for (var i = 0; i < this.data.length; i++) {
            this.data[i] = this.data[i].slice(extra);
        }
    }
}

/**
 * Return just the data that is to be shown
 */
Nengo.DataStore.prototype.get_shown_data = function() {
    /* determine time range */
    var t1 = this.sim.time_slider.first_shown_time;
    var t2 = t1 + this.sim.time_slider.shown_time;

    /* find the corresponding index values */
    var index = 0;
    while (this.times[index] < t1) {
        index += 1;
    }
    var last_index = index;
    while (this.times[last_index] < t2 && last_index < this.times.length) {
        last_index += 1;
    }
    this.first_shown_index = index;

    /** return the visible slice of the data */
    var shown = [];
    for (var i = 0; i < this.data.length; i++) {
        shown.push(this.data[i].slice(index, last_index));
    }
    return shown;
}

Nengo.DataStore.prototype.is_at_end = function() {
    var ts = this.sim.time_slider;
    return (ts.last_time < ts.first_shown_time + ts.shown_time + 0.000000001);
}


Nengo.DataStore.prototype.get_last_data = function() {
    /* determine time range */
    var t1 = this.sim.time_slider.first_shown_time;
    var t2 = t1 + this.sim.time_slider.shown_time;

    /* find the corresponding index values */
    var last_index = 0;
    while (this.times[last_index] < t2 && last_index < this.times.length - 1) {
        last_index += 1;
    }

    /** return the visible slice of the data */
    var shown = [];
    for (var i = 0; i < this.data.length; i++) {
        shown.push(this.data[i][last_index]);
    }
    return shown;
}


/**
 * Generate a color sequence of a given length.
 *
 * Colors are defined using a color blind-friendly palette.
 */
Nengo.make_colors = function(N) {
    //Color blind palette with blue, green, red, magenta, yellow, cyan
    var palette=["#1c73b3","#039f74","#d65e00","#cd79a7","#f0e542","#56b4ea"];
    var c = [];

    for (var i = 0; i < N; i++) {
        c.push(palette[i % palette.length]);
    }
    return c;
}

//Check if a string value represents a number
Nengo.is_num = function(value){
    if (!(isNaN(value)) && !(value.trim() == '') ) {
        return true;
    }
    else{
        return false;
    }
}

Nengo.next_zindex = function() {
    Nengo.max_zindex++;
    return Nengo.max_zindex;
}
