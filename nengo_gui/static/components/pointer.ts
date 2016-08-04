/**
 * Decoded semantic pointer display.
 *
 * @constructor
 * @param {DOMElement} parent - the element to add this component to
 * @param {SimControl} sim - the simulation controller
 * @param {dict} args - A set of constructor arguments (see Component)
 *
 * Pointer constructor is called by python server when a user requests a plot
 * or when the config file is making graphs. Server request is handled in
 * netgraph.js {.on_message} function.
 */

import "./pointer.css";
import { Component } from "./component";
import { DataStore } from "../datastore";
import * as utils from "../utils";

export default class Pointer extends Component {

constructor(parent, viewport, sim, args) {
    super(parent, viewport, args);
    var self = this;

    this.sim = sim;
    this.pointer_status = false;

    this.pdiv = document.createElement('div');
    this.pdiv.style.width = args.width;
    this.pdiv.style.height = args.height;
    utils.set_transform(this.pdiv, 0, 25);
    this.pdiv.style.position = 'fixed';
    this.pdiv.classList.add('pointer');
    this.div.appendChild(this.pdiv);

    this.show_pairs = args.show_pairs;

    // For storing the accumulated data
    this.data_store = new DataStore(1, this.sim, 0);

    // Call schedule_update whenever the time is adjusted in the SimControl
    this.sim.div.addEventListener('adjust_time', function(e) {
        self.schedule_update();
    }, false);

    // Call reset whenever the simulation is reset
    this.sim.div.addEventListener('sim_reset', function(e) {
        self.reset();
    }, false);

    this.on_resize(this.get_screen_width(), this.get_screen_height());

    this.fixed_value = '';

    this.div.addEventListener("mouseup", function(event) {
        // For some reason 'tap' doesn't seem to work here while the
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
    });

    this.div.addEventListener("mousedown", function(event) {
        self.mouse_down_time = new Date().getTime() / 1000;
    });
};

generate_menu() {
    var self = this;
    var items = [];
    items.push(['Set value...', function() {
        self.set_value();
    }]);
    if (this.show_pairs) {
        items.push(['Hide pairs', function() {
            self.set_show_pairs(false);
        }]);
    } else {
        items.push(['Show pairs', function() {
            self.set_show_pairs(true);
        }]);
    }

    // Add the parent's menu items to this
    // TODO: is this really the best way to call the parent's generate_menu()?
    return $.merge(items, Component.prototype.generate_menu.call(this));
};

set_show_pairs(value) {
    if (this.show_pairs !== value) {
        this.show_pairs = value;
        this.save_layout();
    }
};

set_value() {
    var self = this;
    self.sim.modal.title('Enter a Semantic Pointer value...');
    self.sim.modal.single_input_body('Pointer', 'New value');
    self.sim.modal.footer('ok_cancel', function(e) {
        var value = $('#singleInput').val();
        var modal = $('#myModalForm').data('bs.validator');

        modal.validate();
        if (modal.hasErrors() || modal.isIncomplete()) {
            return;
        }
        if ((value === null) || (value === '')) {
            value = ':empty:';
        }
        self.fixed_value = value;
        self.ws.send(value);
        $('#OK').attr('data-dismiss', 'modal');
    });
    var $form = $('#myModalForm').validator({
        custom: {
            my_validator: function($item) {
                var ptr = $item.val();
                if (ptr === null) {
                    ptr = '';
                }
                self.ws.send(':check only:' + ptr);
                return self.pointer_status;
            }
        }
    });

    $('#singleInput').attr('data-error', 'Invalid semantic ' +
        'pointer expression. Semantic pointers themselves must start with ' +
        'a capital letter. Expressions can include mathematical operators ' +
        'such as +, * (circular convolution), and ~ (pseudo-inverse). ' +
        'E.g., (A+~(B*C)*2)*0.5 would be a valid semantic pointer expression.');

    self.sim.modal.show();
};

/**
 * Receive new line data from the server.
 */
on_message(event) {
    var data = event.data.split(" ");

    if (data[0].substring(0, 11) == "bad_pointer") {
        this.pointer_status = false;
        return;
    } else if (data[0].substring(0, 12) == "good_pointer") {
        this.pointer_status = true;
        return;
    }

    var time = parseFloat(data[0]);

    var items = data[1].split(";");
    this.data_store.push([time, items]);
    this.schedule_update();
};

/**
 * Redraw the lines and axis due to changed data.
 */
update() {
    // Let the data store clear out old values
    this.data_store.update();

    var data = this.data_store.get_last_data()[0];

    while (this.pdiv.firstChild) {
        this.pdiv.removeChild(this.pdiv.firstChild);
    }
    this.pdiv.style.width = this.width;
    this.pdiv.style.height = this.height;

    if (data === undefined) {
        return;
    }

    var total_size = 0;

    var items = [];

    // Display the text in proportion to similarity
    for (var i = 0; i < data.length; i++) {
        var size = parseFloat(data[i].substring(0, 4));
        var span = document.createElement('span');
        span.innerHTML = data[i].substring(4);
        this.pdiv.appendChild(span);
        total_size += size;
        var c = Math.floor(255 - 255 * size);
        // TODO: Use clip
        if (c < 0) {
            c = 0;
        }
        if (c > 255) {
            c = 255;
        }
        span.style.color = 'rgb(' + c + ',' + c + ',' + c + ')';
        items.push(span);
    }

    var scale = this.height / total_size * 0.6;

    for (var i = 0; i < data.length; i++) {
        var size = parseFloat(data[i].substring(0, 4));
        items[i].style.fontSize = '' + (size * scale) + 'px';
    }
};

/**
 * Adjust the graph layout due to changed size.
 */
on_resize(width, height) {
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

layout_info() {
    var info = Component.prototype.layout_info.call(this);
    info.show_pairs = this.show_pairs;
    return info;
};

update_layout(config) {
    this.show_pairs = config.show_pairs;
    Component.prototype.update_layout.call(this, config);
};

reset(event) {
    this.data_store.reset();
    this.schedule_update();
};

}
