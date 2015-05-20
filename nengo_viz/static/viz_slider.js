/**
 * A slider to adjust Node values
 * @constructor
 *
 * @params {dict} args - a set of constructor arguments (see VIZ.Component)
 * @params {int} args.n_sliders - the number of sliders to show
 */
VIZ.Slider = function(parent, sim, args) {
    VIZ.Component.call(this, parent, args);
    var self = this;
    this.sim = sim;

    //Check if user is filling in a number into a slider
    this.filling_slider_value = false;
    this.n_sliders = args.n_sliders;

    this.data_store = null;

    this.notify_msgs = [];
    // TODO: get rid of the immediate parameter once the websocket delay
    //       fix is merged in (#160)
    this.immediate_notify = true;

    this.calc_axes_geometry(this.width, this.height);

    this.minHeight = 40;

    this.group = document.createElement('div');
    this.group.style.height = this.slider_height;
    this.group.style.marginTop = this.ax_top;
    this.group.style.whiteSpace = 'nowrap';
    this.group.position = 'relative';
    this.div.appendChild(this.group);

    /** make the sliders */
    this.reset_value = args.start_value;
    this.sliders = [];
    for (var i = 0; i < args.n_sliders; i++) {
        var slider = new VIZ.SliderControl(args.min_value, args.max_value);
        slider.container.style.width = (100 / args.n_sliders) + '%';
        slider.display_value(args.start_value[i]);
        slider.index = i;
        slider.fixed = false;

        slider.on('change', function(event) {
            event.target.fixed = true;
            self.send_value(event.target.index, event.value);
        }).on('changestart', function(event) {
            self.menu.hide_any();
            for (var i in this.sliders) {
                if (this.sliders[i] !== event.target) {
                    this.sliders[i].deactivate_type_mode();
                }
            }
        });

        this.group.appendChild(slider.container);
        this.sliders.push(slider);
    }

    /** call schedule_update whenever the time is adjusted in the SimControl */    
    this.sim.div.addEventListener('adjust_time', 
            function(e) {self.schedule_update();}, false);

    this.on_resize(this.get_screen_width(), this.get_screen_height()); 
};
VIZ.Slider.prototype = Object.create(VIZ.Component.prototype);
VIZ.Slider.prototype.constructor = VIZ.Slider;

VIZ.Slider.prototype.calc_axes_geometry = function(width, height) {
    scale = parseFloat($('#main').css('font-size'));
    this.border_size = 1;
    this.ax_top = 1.75 * scale;
    this.slider_height = height - this.ax_top;
};

VIZ.Slider.prototype.send_value = function(slider_index, value) {
    console.assert(typeof slider_index == 'number');
    console.assert(typeof value == 'number');

    if (this.immediate_notify) {
        this.ws.send(slider_index + ',' + value);
    } else {
        this.notify(slider_index + ',' + value);
    }
    this.sim.time_slider.jump_to_end();
};

/**
 * Receive new line data from the server
 */
VIZ.Slider.prototype.on_message = function(event) {
    var data = new Float32Array(event.data);
    if (this.data_store === null) {
        this.data_store = new VIZ.DataStore(this.sliders.length, this.sim, 0);
    }
    this.reset_value = [];
    for (var i = 0; i < this.sliders.length; i++) {
        this.reset_value.push(data[i + 1]);

        if (this.sliders[i].fixed) {
            data[i + 1] = this.sliders[i].value;
        }
    }
    this.data_store.push(data);

    this.schedule_update();
}


/**
 * update visual display based when component is resized
 */
VIZ.Slider.prototype.on_resize = function(width, height) {
    console.assert(typeof width == 'number');
    console.assert(typeof height == 'number');

    if (width < this.minWidth) {
        width = this.minWidth;
    }
    if (height < this.minHeight) {
        height = this.minHeight;
    };

    this.calc_axes_geometry();

    this.group.style.height = height - this.ax_top - 2 * this.border_size;
    this.group.style.marginTop = this.ax_top;

    var N = this.sliders.length;
    for (var i in this.sliders) {
        this.sliders[i].on_resize();
    }

    this.label.style.width = width;
    this.width = width;
    this.height = height;
    this.div.style.width = width;
    this.div.style.height= height;
};


VIZ.Slider.prototype.generate_menu = function() {
    var self = this;
    var items = [];
    items.push(['Set range...', function() {self.set_range();}]);
    items.push(['Set value...', function() {self.user_value();}]);
    items.push(['Reset value', function() {self.user_reset_value();}]);

    // add the parent's menu items to this
    // TODO: is this really the best way to call the parent's generate_menu()?
    return $.merge(items, VIZ.Component.prototype.generate_menu.call(this));
};

/** report an event back to the server */
VIZ.Slider.prototype.notify = function(info) {
    this.notify_msgs.push(info);

    // only send one message at a time
    // TODO: find a better way to figure out when it's safe to send
    // another message, rather than just waiting 1ms....
    if (this.notify_msgs.length == 1) {
        var self = this;
        window.setTimeout(function() {
            self.send_notify_msg();
        }, 50);
    }
}

/** send exactly one message back to server
 *  and schedule the next message to be sent, if any
 */
VIZ.Slider.prototype.send_notify_msg = function() {
    msg = this.notify_msgs[0];
    this.ws.send(msg);
    if (this.notify_msgs.length > 1) {
        var self = this;
        window.setTimeout(function() {
            self.send_notify_msg();
        }, 50);
    }
    this.notify_msgs.splice(0, 1);
}

VIZ.Slider.prototype.update = function() {
    /** let the data store clear out old values */
    if (this.data_store !== null) {
        this.data_store.update();

        var data = this.data_store.get_last_data();

        for (var i=0; i< this.sliders.length; i++) {
            if (!this.data_store.is_at_end() || !this.sliders[i].fixed) {
                this.sliders[i].display_value(data[i]);
            }
        }
    }
}

VIZ.Slider.prototype.user_value = function () {

    //First build the prompt string
    var prompt_string = 'Example: ';
    for (var i = 0; i < this.sliders.length; i++){
        var rand = (Math.random() * 10).toFixed(1);
        prompt_string = prompt_string + rand;
        if (i != this.sliders.length - 1) {
            prompt_string = prompt_string + ", ";
        }
    }
    var new_value = prompt('Set value\n' + prompt_string);

    //If the user hits cancel
    if (new_value == null) {
        return;
    };

    //Make the string into a list
    new_value = new_value.split(',');

    //Update the sliders one at a time, checking input as we go
    this.immediate_notify = false;
    for (var i = 0; i < this.sliders.length; i++){
        if (!(VIZ.is_num(new_value[i]))) {
            alert("invalid input :" + new_value[i] + "\nFor the slider in position " + (i + 1) );
            break;
        }
        this.sliders[i].fixed = true;
        this.sliders[i].set_value(parseFloat(new_value[i]));
    }
    this.immediate_notify = true;
};

VIZ.Slider.prototype.user_reset_value = function() {
    for (var i = 0; i < this.sliders.length; i++){
        this.notify('' + i + ',reset');
        this.sliders[i].fixed = false;
        this.sliders[i].display_value(this.reset_value[i]);
    }
}

VIZ.Slider.prototype.set_range = function() {
    var range = this.sliders[0].scale.domain();
    var new_range = prompt('Set range', '' + range[1] + ',' + range[0]);
    if (new_range !== null) {
        new_range = new_range.split(',');
        var min = parseFloat(new_range[0]);
        var max = parseFloat(new_range[1]);
        for (var i in this.sliders) {
            this.sliders[i].set_range(min, max);
        }
        this.save_layout();
    }
};

VIZ.Slider.prototype.layout_info = function () {
    var info = VIZ.Component.prototype.layout_info.call(this);
    info.width = info.width;
    info.min_value = this.sliders[0].scale.domain()[1];
    info.max_value = this.sliders[0].scale.domain()[0];
    return info;
};
