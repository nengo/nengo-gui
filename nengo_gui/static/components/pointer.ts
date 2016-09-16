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

import * as $ from "jquery";

import { DataStore } from "../datastore";
import * as utils from "../utils";
import * as viewport from "../viewport";
import { Component } from "./component";
import "./pointer.css";

export class Pointer extends Component {
    data_store;
    fixed_value;
    mouse_down_time;
    pdiv;
    pointer_status;
    show_pairs;
    sim;

    constructor(parent, sim, args) {
        super(parent, args);

        this.sim = sim;
        this.pointer_status = false;

        this.pdiv = document.createElement("div");
        this.pdiv.style.width = args.width;
        this.pdiv.style.height = args.height;
        utils.set_transform(this.pdiv, 0, 25);
        this.pdiv.style.position = "fixed";
        this.pdiv.classList.add("pointer");
        this.div.appendChild(this.pdiv);

        this.show_pairs = args.show_pairs;

        // For storing the accumulated data
        this.data_store = new DataStore(1, this.sim, 0);

        // Call schedule_update whenever the time is adjusted in the SimControl
        this.sim.time_slider.div.addEventListener("adjust_time", e => {
            this.schedule_update();
        });

        // Call reset whenever the simulation is reset
        this.sim.div.addEventListener("reset_sim", e => {
            this.reset();
        });

        this.on_resize(
            viewport.scale_width(this.w), viewport.scale_height(this.h));

        this.fixed_value = "";

        this.div.addEventListener("mouseup", function(event) {
            // For some reason "tap" doesn't seem to work here while the
            // simulation is running, so I'm doing the timing myself
            const now = new Date().getTime() / 1000;
            if (now - this.mouse_down_time > 0.1) {
                return;
            }
            if (event.button === 0) {
                if (this.menu.visible) {
                    this.menu.hide();
                } else {
                    this.menu.show(event.clientX, event.clientY,
                                   this.generate_menu());
                }
            }
        });

        this.div.addEventListener("mousedown", function(event) {
            this.mouse_down_time = new Date().getTime() / 1000;
        });
    };

    generate_menu() {
        const items = [];
        items.push(["Set value...", function() {
            this.set_value();
        }]);
        if (this.show_pairs) {
            items.push(["Hide pairs", function() {
                this.set_show_pairs(false);
            }]);
        } else {
            items.push(["Show pairs", function() {
                this.set_show_pairs(true);
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
        this.sim.modal.title("Enter a Semantic Pointer value...");
        this.sim.modal.single_input_body("Pointer", "New value");
        this.sim.modal.footer("ok_cancel", function(e) {
            let value = $("#singleInput").val();
            const modal = $("#myModalForm").data("bs.validator");

            modal.validate();
            if (modal.hasErrors() || modal.isIncomplete()) {
                return;
            }
            if ((value === null) || (value === "")) {
                value = ":empty:";
            }
            this.fixed_value = value;
            this.ws.send(value);
            $("#OK").attr("data-dismiss", "modal");
        });
        $("#myModalForm").validator({
            custom: {
                my_validator: function($item) {
                    let ptr = $item.val();
                    if (ptr === null) {
                        ptr = "";
                    }
                    this.ws.send(":check only:" + ptr);
                    return this.pointer_status;
                },
            },
        });

        $("#singleInput").attr(
            "data-error",
            "Invalid semantic pointer expression. Semantic pointers " +
                "themselves must start with a capital letter. Expressions " +
                "can include mathematical operators such as +, * (circular " +
                "convolution), and ~ (pseudo-inverse). E.g., " +
                "(A+~(B*C)*2)*0.5 would be a valid semantic pointer " +
                "expression.");

        this.sim.modal.show();
    };

    /**
     * Receive new line data from the server.
     */
    on_message(event) {
        const data = event.data.split(" ");

        if (data[0].substring(0, 11) === "bad_pointer") {
            this.pointer_status = false;
            return;
        } else if (data[0].substring(0, 12) === "good_pointer") {
            this.pointer_status = true;
            return;
        }

        const time = parseFloat(data[0]);

        const items = data[1].split(";");
        this.data_store.push([time, items]);
        this.schedule_update();
    };

    /**
     * Redraw the lines and axis due to changed data.
     */
    update() {
        // Let the data store clear out old values
        this.data_store.update();

        const data = this.data_store.get_last_data()[0];

        while (this.pdiv.firstChild) {
            this.pdiv.removeChild(this.pdiv.firstChild);
        }
        this.pdiv.style.width = this.width;
        this.pdiv.style.height = this.height;

        if (data === undefined) {
            return;
        }

        let total_size = 0;
        const items = [];

        // Display the text in proportion to similarity
        for (let i = 0; i < data.length; i++) {
            const size = parseFloat(data[i].substring(0, 4));
            const span = document.createElement("span");
            span.innerHTML = data[i].substring(4);
            this.pdiv.appendChild(span);
            total_size += size;
            let c = Math.floor(255 - 255 * size);
            // TODO: Use clip
            if (c < 0) {
                c = 0;
            }
            if (c > 255) {
                c = 255;
            }
            span.style.color = "rgb(" + c + "," + c + "," + c + ")";
            items.push(span);
        }

        const scale = this.height / total_size * 0.6;

        for (let i = 0; i < data.length; i++) {
            const size = parseFloat(data[i].substring(0, 4));
            items[i].style.fontSize = "" + (size * scale) + "px";
        }
    };

    /**
     * Adjust the graph layout due to changed size.
     */
    on_resize(width, height) {
        if (width < this.min_width) {
            width = this.min_width;
        }
        if (height < this.min_height) {
            height = this.min_height;
        }

        this.width = width;
        this.height = height;
        this.div.style.width = width;
        this.div.style.height = height;

        this.label.style.width = width;

        this.update();
    };

    layout_info() {
        const info = Component.prototype.layout_info.call(this);
        info.show_pairs = this.show_pairs;
        return info;
    };

    update_layout(config) {
        this.show_pairs = config.show_pairs;
        Component.prototype.update_layout.call(this, config);
    };

    reset() {
        this.data_store.reset();
        this.schedule_update();
    };
}
