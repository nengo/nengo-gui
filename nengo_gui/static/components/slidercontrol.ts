/**
 * A SliderControl object which creates a single guideline + handle within
 * a slider object.
 *
 * @constructor
 * @param {int} min - The minimum value the handle can take
 * @param {int} max - the maximum value the handle can take
 *
 * SliderControl is called within the Slider constructor for each
 * handle that is needed.
 */

import * as d3 from "d3";
import * as interact from "interact.js";
import * as $ from "jquery";

import * as utils from "../utils";

export default class SliderControl {
    _drag_y;
    border_width;
    container;
    fixed;
    guideline;
    handle;
    index;
    listeners;
    max;
    min;
    scale;
    type_mode;
    value;

    constructor(min, max) {
        this.min = min;
        this.max = max;

        this.value = 0;
        this.type_mode = false;

        this.border_width = 1;

        this.scale = d3.scale.linear();
        this.scale.domain([max, min]);

        // TODO: move CSS to CSS file
        this.container = document.createElement("div");
        this.container.style.display = "inline-block";
        this.container.style.position = "relative";
        this.container.style.height = "100%";
        this.container.style.padding = "0.75em 0";

        this.guideline = document.createElement("div");
        this.guideline.classList.add("guideline");
        this.guideline.style.width = "0.5em";
        this.guideline.style.height = "100%";
        this.guideline.style.margin = "auto";
        $(this.guideline).on("mousedown", event => {
            this.set_value(this.value);
        });
        this.container.appendChild(this.guideline);

        this.handle = document.createElement("div");
        this.handle.classList.add("btn");
        this.handle.classList.add("btn-default");
        utils.safe_set_text(this.handle, "n/a");
        this.handle.style.position = "absolute";
        this.handle.style.height = "1.5em";
        this.handle.style.marginTop = "0.75em";
        this.handle.style.width = "95%";
        this.handle.style.fontSize = "inherit";
        this.handle.style.padding = "0.1em 0";
        this.handle.style.borderWidth = this.border_width + "px";
        this.handle.style.borderColor = "#666";
        this.handle.style.left = "2.5%";
        this.handle.style.transform = "translate(0, -50%)";
        this.update_handle_pos(0);
        this.container.appendChild(this.handle);

        interact(this.handle).draggable({
            onend: event => {
                this.dispatch("changeend", {"target": this});
            },
            onmove: event => {
                this._drag_y += event.dy;

                this.scale.range([0, this.guideline.clientHeight]);
                this.set_value(this.scale.invert(this._drag_y));
            },
            onstart: () => {
                this.dispatch("changestart", {"target": this});
                this.deactivate_type_mode(null);
                this._drag_y = this.get_handle_pos();
            },
        });

        interact(this.handle).on("tap", event => {
            this.activate_type_mode();
            event.stopPropagation();
        }).on("keydown", event => {
            this.handle_keypress(event);
        });

        this.listeners = {};
    }

    on(ltype, fn) {
        this.listeners[ltype] = fn;
        return this;
    }

    dispatch(ltype, ev) {
        if (ltype in this.listeners) {
            this.listeners[ltype].call(this, ev);
        }
    }

    set_range(min, max) {
        this.min = min;
        this.max = max;
        this.scale.domain([max, min]);
        this.set_value(this.value);
        this.on_resize();
    }

    display_value(value) {
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

    set_value(value) {
        this.display_value(value);
        this.dispatch("change", {"target": this, "value": this.value});
    }

    activate_type_mode() {
        if (this.type_mode) {
            return;
        }

        this.dispatch("changestart", {"target": this});

        this.type_mode = true;

        $(this.handle).empty().append(
            "<input id='value_in_field' style='border:0; outline:0;'></input>"
        );

        const elem = this.handle.querySelector("#value_in_field");
        elem.value = this.format_value(this.value);
        elem.focus();
        elem.select();
        elem.style.width = "100%";
        elem.style.textAlign = "center";
        elem.style.backgroundColor = "transparent";
        $(elem).on("input", event => {
            if (utils.is_num(elem.value)) {
                this.handle.style.backgroundColor = "";
            } else {
                this.handle.style.backgroundColor = "salmon";
            }
        }).on("blur", event => {
            this.deactivate_type_mode(null);
        });
    }

    deactivate_type_mode(event) {
        if (!this.type_mode) {
            return;
        }

        this.dispatch("changeend", {"target": this});

        this.type_mode = false;

        $(this.handle).off("keydown");
        this.handle.style.backgroundColor = "";
        utils.safe_set_text(this.handle, this.format_value(this.value));
    }

    handle_keypress(event) {
        if (!this.type_mode) {
            return;
        }

        const enter_keycode = 13;
        const esc_keycode = 27;
        const key = event.which;

        if (key === enter_keycode) {
            const input = this.handle.querySelector("#value_in_field").value;
            if (utils.is_num(input)) {
                this.deactivate_type_mode(null);
                this.set_value(parseFloat(input));
            }
        } else if (key === esc_keycode) {
            this.deactivate_type_mode(null);
        }
    }

    update_handle_pos(value) {
        this.handle.style.top = this.scale(value) + this.border_width;
    }

    get_handle_pos() {
        return parseFloat(this.handle.style.top) - this.border_width;
    }

    update_value_text(value) {
        utils.safe_set_text(this.handle, this.format_value(value));
    }

    format_value(value) {
        return value.toFixed(2);
    }

    on_resize() {
        this.scale.range([0, this.guideline.clientHeight]);
        this.update_handle_pos(this.value);
    }
}
