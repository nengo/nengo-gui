/**
 * Decoded pointer display
 * @constructor
 *
 * @param {dict} args - A set of constructor arguments (see VIZ.Component)
 * @param {VIZ.SimControl} args.sim - the simulation controller
 */
 
VIZ.Pointer = function(parent, sim, args) {
    VIZ.Component.call(this, parent, args);
    var self = this;

    this.sim = sim;
        
    this.pdiv = document.createElement('div');
    this.pdiv.style.width = args.width;
    this.pdiv.style.height = args.height;
    VIZ.set_transform(this.pdiv, 0, 0);
    this.pdiv.style.position = 'fixed';
    this.pdiv.classList.add('pointer');
    this.div.appendChild(this.pdiv);
    
    this.show_pairs = args.show_pairs;
    
    /** for storing the accumulated data */
    this.data_store = new VIZ.DataStore(1, this.sim, 0);

    /** call schedule_update whenever the time is adjusted in the SimControl */    
    this.sim.div.addEventListener('adjust_time', 
            function(e) {self.schedule_update();}, false);
    
    this.on_resize(this.get_screen_width(), this.get_screen_height()); 
    
    this.fixed_value = '';
    var self = this;
    
    this.div.addEventListener("mouseup", 
        function(event) {
            // for some reason 'tap' doesn't seem to work here while the
            // simulation is running, so I'm doing the timing myself
            var now = new Date().getTime() / 1000;
            if (now - self.mouse_down_time > 0.1) {
                return;
            }
            if (event.button == 0) {
                if (self.menu.visible) {
                    self.menu.hide();
                } else {
                    self.menu.show(event.clientX, event.clientY, 
                                   self.generate_menu());
                }
            }
        }
    );    

    this.div.addEventListener("mousedown", 
        function(event) {
            self.mouse_down_time = new Date().getTime() / 1000;
        }
    );        
    

    
};
VIZ.Pointer.prototype = Object.create(VIZ.Component.prototype);
VIZ.Pointer.prototype.constructor = VIZ.Pointer;

VIZ.Pointer.prototype.generate_menu = function() {
    var self = this;
    var items = [];
    items.push(['Set value...', function() {self.set_value();}]);
    if (this.show_pairs) {
        items.push(['Hide pairs', function() {self.set_show_pairs(false);}]);
    } else {
        items.push(['Show pairs', function() {self.set_show_pairs(true);}]);
    }

    // add the parent's menu items to this
    // TODO: is this really the best way to call the parent's generate_menu()?
    return $.merge(items, VIZ.Component.prototype.generate_menu.call(this));
};

VIZ.Pointer.prototype.set_show_pairs = function(value) {
    if (this.show_pairs !== value) {
        this.show_pairs = value;
        this.save_layout();
    }
};

VIZ.Pointer.prototype.set_value = function() {
    var value = prompt('Enter a Semantic Pointer value', 
                       this.fixed_value);
    if (value == null) { 
        value = ''; 
    }
    this.fixed_value = value;
    this.ws.send(value);
};


/**
 * Receive new line data from the server
 */
VIZ.Pointer.prototype.on_message = function(event) {
    data = event.data.split(" ");
    var time = parseFloat(data[0]);
    
    var items = data[1].split(";");
    
    this.data_store.push([time, items]);
    this.schedule_update();
}
   
/**
 * Redraw the lines and axis due to changed data
 */
VIZ.Pointer.prototype.update = function() {
    /** let the data store clear out old values */
    this.data_store.update();
    
    var data = this.data_store.get_last_data()[0];
    
    while(this.pdiv.firstChild) {
        this.pdiv.removeChild(this.pdiv.firstChild);
    }
    this.pdiv.style.width = this.width;
    this.pdiv.style.height = this.height;
    
    if (data === undefined) {
        return;
    }
    
    var total_size = 0;
    
    var items = [];
    
    for (var i=0; i < data.length; i++) {
        var size = parseFloat(data[i].substring(0,4));
        var span = document.createElement('span');
        span.innerHTML = data[i].substring(4);
        this.pdiv.appendChild(span);
        total_size += size;
        var c = Math.floor(255 - 255 * size);
        if (c<0) c = 0;
        if (c>255) c = 255;
        span.style.color = 'rgb('+c+','+c+','+c+')';
        items.push(span);
    }
    
    var scale = this.height / total_size * 0.75;
    
    for (var i=0; i < data.length; i++) {
        var size = parseFloat(data[i].substring(0,4));
        items[i].style.fontSize = '' + (size * scale) + 'px'
    }
};

/** 
 * Adjust the graph layout due to changed size
 */
VIZ.Pointer.prototype.on_resize = function(width, height) {
    if (width < this.minWidth) {
        width = this.minWidth;
    }
    if (height < this.minHeight) {
        height = this.minHeight;
    };

    this.width = width;
    this.height = height;
    this.div.style.width = width;
    this.div.style.height = height;

    this.label.style.width = width;
    
    this.update();
};


VIZ.Pointer.prototype.layout_info = function () {
    var info = VIZ.Component.prototype.layout_info.call(this);
    info.show_pairs = this.show_pairs;
    return info;
}

VIZ.Pointer.prototype.update_layout = function (config) {
    this.show_pairs = config.show_pairs;
    VIZ.Component.prototype.update_layout.call(this, config);
}
