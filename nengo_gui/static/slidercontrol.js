Nengo.SliderControl = function(min, max) {
    var self = this;

    this.min = min;
    this.max = max;

    this.value = 0.
    this.type_mode = false;

    this.border_width = 1

    this.scale = d3.scale.linear();
    this.scale.domain([max,  min]);

    // TODO move CSS to CSS file
    this.container = document.createElement('div');
    this.container.style.display = 'inline-block';
    this.container.style.position = 'relative';
    this.container.style.height = '100%';
    this.container.style.padding = '0.75em 0';

    this.guideline = document.createElement('div');
    this.guideline.classList.add('guideline');
    this.guideline.style.width = '0.5em';
    this.guideline.style.height = '100%';
    this.guideline.style.margin = 'auto';
    this.container.appendChild(this.guideline);


    this.handle = document.createElement('div');
    this.handle.classList.add('btn');
    this.handle.classList.add('btn-default');
    this.handle.innerHTML = 'n/a';
    this.handle.style.position = 'absolute';
    this.handle.style.height = '1.5em';
    this.handle.style.marginTop = '0.75em';
    this.handle.style.width = '95%';
    this.handle.style.fontSize = 'inherit';
    this.handle.style.padding = '0.1em 0';
    this.handle.style.borderWidth = this.border_width + 'px';
    this.handle.style.borderColor = '#666';
    this.handle.style.left = '2.5%';
    this.handle.style.transform = 'translate(0, -50%)';
    this.update_handle_pos(0);
    this.container.appendChild(this.handle);

    interact(this.handle)
        .draggable({
            onstart: function () {
                self.dispatch('changestart', {'target': this});
                self.deactivate_type_mode();
                self._drag_y = self.get_handle_pos();
            },
            onmove: function (event) {
                var target = event.target;
                self._drag_y += event.dy;

                self.scale.range([0, self.guideline.clientHeight]);
                self.set_value(self.scale.invert(self._drag_y))
            },
            onend: function (event) {
                self.dispatch('changeend', {'target': this});
            }
        });

    interact(this.handle)
        .on('tap', function(event) {
            self.activate_type_mode();
            event.stopPropagation();
         }).on('keydown', function(event) { self.handle_keypress(event); });

    this.listeners = {};
};

Nengo.SliderControl.prototype.on = function(type, fn) {
    this.listeners[type] = fn;
    return this;
}

Nengo.SliderControl.prototype.dispatch = function(type, ev) {
    if (type in this.listeners) {
        this.listeners[type].call(this, ev);
    }
}

Nengo.SliderControl.prototype.set_range = function(min, max) {
    this.min = min;
    this.max = max;
    this.scale.domain([max,  min]);
    this.set_value(this.value);
    this.on_resize();
};

Nengo.SliderControl.prototype.display_value = function(value) {
    if (value < this.min) {
        value = this.min;
    }
    if (value > this.max) {
        value = this.max;
    }

    this.value = value;

    this.update_handle_pos(value);
    this.update_value_text(value);
}

Nengo.SliderControl.prototype.set_value = function(value) {
    var old_value = this.value;
    this.display_value(value);
    if (old_value != this.value) {
        this.dispatch('change', {'target': this, 'value': this.value});
    }
};

Nengo.SliderControl.prototype.activate_type_mode = function() {
    if (this.type_mode) {
        return;
    }

    var self = this;

    this.dispatch('changestart', {'target': this});

    this.type_mode = true;

    this.handle.innerHTML = '<input id="value_in_field" style=" border:0; outline:0;"></input>';
    var elem = this.handle.querySelector('#value_in_field')
    elem.value = this.format_value(this.value);
    elem.focus();
    elem.select();
    elem.style.width = '100%';
    elem.style.textAlign = 'center';
    elem.style.backgroundColor = 'transparent';
    $(elem).on('input', function (event) {
        if (Nengo.is_num(elem.value)) {
            self.handle.style.backgroundColor = '';
        } else {
            self.handle.style.backgroundColor = 'salmon';
        }
    }).on('blur', function (event) {
        self.deactivate_type_mode();
    });
};

Nengo.SliderControl.prototype.deactivate_type_mode = function(event) {
    if (!this.type_mode) {
        return;
    }

    this.dispatch('changeend', {'target': this});

    this.type_mode = false;

    $(this.handle).off('keydown');
    this.handle.style.backgroundColor = '';
    this.handle.innerHTML = this.format_value(this.value);
};

Nengo.SliderControl.prototype.handle_keypress = function(event) {
    if (!this.type_mode) {
        return;
    }

    var enter_keycode = 13;
    var esc_keycode = 27;
    var key = event.which;

    if (key == enter_keycode) {
        var input = this.handle.querySelector('#value_in_field').value;
        if (Nengo.is_num(input)) {
            this.deactivate_type_mode();
            this.set_value(parseFloat(input));
        }
    } else if (key == esc_keycode) {
        this.deactivate_type_mode();
    }
};

Nengo.SliderControl.prototype.update_handle_pos = function(value) {
    this.handle.style.top = this.scale(value) + this.border_width;
};

Nengo.SliderControl.prototype.get_handle_pos = function() {
    return parseFloat(this.handle.style.top) - this.border_width;
};

Nengo.SliderControl.prototype.update_value_text = function(value) {
    this.handle.innerHTML = this.format_value(value);
};

Nengo.SliderControl.prototype.format_value = function(value) {
    return value.toFixed(2);
}

Nengo.SliderControl.prototype.on_resize = function() {
    this.scale.range([0, this.guideline.clientHeight]);
    this.update_handle_pos(this.value);
};
