/**
 * Raster plot showing spike events over time.
 *
 * @constructor
 * @param {DOMElement} parent - the element to add this component to
 * @param {SimControl} sim - the simulation controller
 * @param {dict} args - A set of constructor arguments (see Component)
 * @param {int} args.n_neurons - number of neurons
 *
 * Raster constructor is called by python server when a user requests a plot
 * or when the config file is making graphs. Server request is handled in
 * netgraph.js {.on_message} function.
 */

import * as d3 from "d3";
import * as $ from "jquery";

import { DataStore } from "../datastore";
import * as utils from "../utils";
import * as viewport from "../viewport";
import Component from "./component";
import "./raster.css";
import TimeAxes from "./time_axes";

export default class Raster extends Component {
    axes2d;
    data_store;
    n_neurons;
    path;
    sim;

    constructor(parent, sim, args) {
        super(parent, args);
        const self = this;
        this.n_neurons = args.n_neurons || 1;
        this.sim = sim;

        // For storing the accumulated data
        this.data_store = new DataStore(1, this.sim, 0);

        this.axes2d = new TimeAxes(this.div, args);
        this.axes2d.scale_y.domain([0, args.n_neurons]);

        // Call schedule_update whenever the time is adjusted in the SimControl
        this.sim.div.addEventListener("adjust_time", function(e) {
            self.schedule_update(null);
        }, false);

        // Call reset whenever the simulation is reset
        this.sim.div.addEventListener("sim_reset", function(e) {
            self.reset(null);
        }, false);

        // Create the lines on the plots
        d3.svg.line()
            .x(function(d, i) {
                return self.axes2d.scale_x(this.data_store.times[i]);
            })
            .y(function(d) {
                return self.axes2d.scale_y(d);
            });

        this.path = this.axes2d.svg.append("g")
            .selectAll("path")
            .data(this.data_store.data);

        this.path.enter().append("path")
            .attr("class", "line")
            .style("stroke", utils.make_colors(1));

        this.update();
        this.on_resize(
            viewport.scale_width(this.w), viewport.scale_height(this.h));
        this.axes2d.axis_y.tickValues([0, args.n_neurons]);
        this.axes2d.fit_ticks(this);
    };

    /**
     * Receive new line data from the server.
     */
    on_message(event) {
        const time = new Float32Array(event.data, 0, 1);
        const data = new Int16Array(event.data, 4);
        this.data_store.push([time[0], data]);
        this.schedule_update(event);
    };

    set_n_neurons(n_neurons) {
        this.n_neurons = n_neurons;
        this.axes2d.scale_y.domain([0, n_neurons]);
        this.axes2d.axis_y.tickValues([0, n_neurons]);
        this.ws.send("n_neurons:" + n_neurons);
    };

    /**
     * Redraw the lines and axis due to changed data.
     */
    update() {
        // Let the data store clear out old values
        this.data_store.update();

        // Determine visible range from the SimControl
        const t1 = this.sim.time_slider.first_shown_time;
        const t2 = t1 + this.sim.time_slider.shown_time;

        this.axes2d.set_time_range(t1, t2);

        // Update the lines
        const shown_data = this.data_store.get_shown_data();

        const path = [];
        for (let i = 0; i < shown_data[0].length; i++) {
            const t = this.axes2d.scale_x(
                this.data_store.times[
                    this.data_store.first_shown_index + i]);

            for (let j = 0; j < shown_data[0][i].length; j++) {
                const y1 = this.axes2d.scale_y(shown_data[0][i][j]);
                const y2 = this.axes2d.scale_y(shown_data[0][i][j] + 1);
                path.push("M " + t + " " + y1 + "V" + y2);
            }
        }
        this.path.attr("d", path.join(""));
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

        this.axes2d.on_resize(width, height);

        this.update();

        this.label.style.width = width;

        this.width = width;
        this.height = height;
        this.div.style.width = width;
        this.div.style.height = height;
    };

    reset(event) {
        this.data_store.reset();
        this.schedule_update(event);
    };

    generate_menu() {
        const self = this;
        const items = [["Set # neurons...", function() {
            self.set_neuron_count();
        }]];

        return $.merge(items, Component.prototype.generate_menu.call(this));
    };

    set_neuron_count() {
        const self = this;
        const count = this.n_neurons;
        self.sim.modal.title("Set number of neurons...");
        self.sim.modal.single_input_body(count, "Number of neurons");
        self.sim.modal.footer("ok_cancel", function(e) {
            let new_count = $("#singleInput").val();
            const modal = $("#myModalForm").data("bs.validator");
            modal.validate();
            if (modal.hasErrors() || modal.isIncomplete()) {
                return;
            }
            if (new_count !== null) {
                new_count = parseInt(new_count, 10);
                self.set_n_neurons(new_count);
                self.axes2d.fit_ticks(self);
            }
            $("#OK").attr("data-dismiss", "modal");
        });
        $("#myModalForm").validator({
            custom: {
                my_validator: function($item) {
                    let num = $item.val();
                    let valid = false;
                    if ($.isNumeric(num)) {
                        num = Number(num);
                        // TODO: make into utils.isInteger
                        if (num >= 0 && num === parseInt(num, 10)) {
                            valid = true;
                        }
                    }
                    return valid;
                },
            },
        });

        $("#singleInput").attr(
            "data-error", "Input should be a positive integer");

        self.sim.modal.show();
        $("#OK").on("click", function() {
            const div = $(self.div);
            self.on_resize(div.width(), div.height());
        });
    };
}
