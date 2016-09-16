/**
 * Line graph showing decoded values over time.
 *
 * @constructor
 * @param {DOMElement} parent - the exylement to add this component to
 * @param {SimControl} sim - the simulation controller
 * @param {dict} args - A set of constructor arguments (see Component)
 * @param {int} args.n_lines - number of decoded values
 * @param {float} args.min_value - minimum value on x-axis and y-axis
 * @param {float} args.max_value - maximum value on x-axis and y-axis
 * @param {SimControl} args.sim - the simulation controller
 *
 * XYValue constructor is called by python server when a user requests a plot
 * or when the config file is making graphs. Server request is handled in
 * netgraph.js {.on_message} function.
 */

import * as d3 from "d3";
import * as $ from "jquery";

import { DataStore } from "../datastore";
import * as utils from "../utils";
import * as viewport from "../viewport";
import { Component } from "./component";
import { XYAxes } from "./xy_axes";
import "./xyvalue.css";

export class XYValue extends Component {
    axes2d;
    data_store;
    index_x;
    index_y;
    invalid_dims;
    n_lines;
    path;
    recent_circle;
    sim;
    warning_text;

    constructor(parent, sim, args) {
        super(parent, args);

        this.n_lines = args.n_lines || 1;
        this.sim = sim;

        // For storing the accumulated data
        this.data_store = new DataStore(this.n_lines, this.sim, 0);

        this.axes2d = new XYAxes(this.div, args);

        // The two indices of the multi-dimensional data to display
        this.index_x = args.index_x;
        this.index_y = args.index_y;

        // Call schedule_update whenever the time is adjusted in the SimControl
        this.sim.time_slider.div.addEventListener("adjust_time", e => {
            this.schedule_update();
        });

        // Call reset whenever the simulation is reset
        this.sim.div.addEventListener("reset_sim", e => {
            this.reset();
        });

        // Create the lines on the plots
        d3.svg.line()
            .x(function(d, i) {
                return this.axes2d
                    .scale_x(this.data_store.data[this.index_x][i]);
            }).y(function(d) {
                return this.axes2d.scale_y(d);
            });
        this.path = this.axes2d.svg.append("g")
            .selectAll("path")
            .data([this.data_store.data[this.index_y]]);
        this.path.enter().append("path")
            .attr("class", "line")
            .style("stroke", utils.make_colors(1));

        // Create a circle to track the most recent data
        this.recent_circle = this.axes2d.svg.append("circle")
            .attr("r", this.get_circle_radius())
            .attr("cx", this.axes2d.scale_x(0))
            .attr("cy", this.axes2d.scale_y(0))
            .style("fill", utils.make_colors(1)[0])
            .style("fill-opacity", 0);

        this.invalid_dims = false;

        this.axes2d.fit_ticks(this);
        this.on_resize(
            viewport.scale_width(this.w), viewport.scale_height(this.h));
    };

    /**
     * Receive new line data from the server.
     */
    on_message(event) {
        const data = new Float32Array(event.data);
        this.data_store.push(data);
        this.schedule_update();
    };

    /**
     * Redraw the lines and axis due to changed data.
     */
    update() {
        // Let the data store clear out old values
        this.data_store.update();

        // Update the lines if there is data with valid dimensions
        if (this.index_x < this.n_lines && this.index_y < this.n_lines) {
            const shown_data = this.data_store.get_shown_data();

            // Update the lines
            const line = d3.svg.line()
                .x(function(d, i) {
                    return this.axes2d.scale_x(shown_data[this.index_x][i]);
                }).y(function(d) {
                    return this.axes2d.scale_y(d);
                });
            this.path.data([shown_data[this.index_y]])
                .attr("d", line);

            const last_index = shown_data[this.index_x].length - 1;

            if (last_index >= 0) {
                // Update the circle if there is valid data
                this.recent_circle
                    .attr("cx", this.axes2d.scale_x(
                        shown_data[this.index_x][last_index]))
                    .attr("cy", this.axes2d.scale_y(
                        shown_data[this.index_y][last_index]))
                    .style("fill-opacity", 0.5);
            }

            // If switching from invalids dimensions to valid dimensions, remove
            // the label
            if (this.invalid_dims === true) {
                this.div.removeChild(this.warning_text);
                this.invalid_dims = false;
            }

        } else if (this.invalid_dims === false) {
            this.invalid_dims = true;

            // Create the HTML text element
            this.warning_text = document.createElement("div");
            this.div.appendChild(this.warning_text);
            this.warning_text.className = "warning-text";
            this.warning_text.innerHTML = "Change<br>Dimension<br>Indices";
        }
    };

    /**
     * Adjust the graph layout due to changed size
     */
    on_resize(width, height) {
        this.axes2d.on_resize(width, height);

        this.update();

        this.label.style.width = width;
        this.width = width;
        this.height = height;
        this.div.style.width = width;
        this.div.style.height = height;
        this.recent_circle.attr("r", this.get_circle_radius());
    };

    get_circle_radius() {
        return Math.min(this.width, this.height) / 30;
    };

    generate_menu() {
        const this = this;
        const items = [
            ["Set range...", function() {
                this.set_range();
            }],
            ["Set X, Y indices...", function() {
                this.set_indices();
            }],
        ];

        // Add the parent's menu items to this
        return $.merge(items, Component.prototype.generate_menu.call(this));
    };

    layout_info() {
        const info = Component.prototype.layout_info.call(this);
        info.min_value = this.axes2d.scale_y.domain()[0];
        info.max_value = this.axes2d.scale_y.domain()[1];
        info.index_x = this.index_x;
        info.index_y = this.index_y;
        return info;
    };

    update_layout(config) {
        this.update_indices(config.index_x, config.index_y);
        this.update_range(config.min_value, config.max_value);
        Component.prototype.update_layout.call(this, config);
    };

    set_range() {
        const range = this.axes2d.scale_y.domain();
        this.sim.modal.title("Set graph range...");
        this.sim.modal.single_input_body(range, "New range");
        this.sim.modal.footer("ok_cancel", function(e) {
            let new_range = $("#singleInput").val();
            const modal = $("#myModalForm").data("bs.validator");

            modal.validate();
            if (modal.hasErrors() || modal.isIncomplete()) {
                return;
            }
            if (new_range !== null) {
                new_range = new_range.split(",");
                const min = parseFloat(new_range[0]);
                const max = parseFloat(new_range[1]);
                this.update_range(min, max);
                this.update();
                this.save_layout();
            }
            $("#OK").attr("data-dismiss", "modal");
        });
        $("#myModalForm").validator({
            custom: {
                my_validator: function($item) {
                    const nums = $item.val().split(",");
                    let valid = false;
                    if ($.isNumeric(nums[0]) && $.isNumeric(nums[1])) {
                        // Two numbers, 1st less than 2nd.
                        // The axes must intersect at 0.
                        const ordered = Number(nums[0]) < Number(nums[1]);
                        const zeroed = Number(nums[0]) * Number(nums[1]) <= 0;
                        if (ordered && zeroed) {
                            valid = true;
                        }
                    }
                    return (nums.length === 2 && valid);
                },
            },
        });

        $("#singleInput").attr(
            "data-error", "Input should be in the form " +
                "'<min>,<max>' and the axes must cross at zero.");
        this.sim.modal.show();
    };

    update_range(min, max) {
        this.axes2d.min_val = min;
        this.axes2d.max_val = max;
        this.axes2d.scale_x.domain([min, max]);
        this.axes2d.scale_y.domain([min, max]);
        this.axes2d.axis_x.tickValues([min, max]);
        this.axes2d.axis_y.tickValues([min, max]);
        this.axes2d.axis_y_g.call(this.axes2d.axis_y);
        this.axes2d.axis_x_g.call(this.axes2d.axis_x);
        this.on_resize(
            viewport.scale_width(this.w), viewport.scale_height(this.h));
    };

    set_indices() {
        this.sim.modal.title("Set X and Y indices...");
        this.sim.modal.single_input_body(
            [this.index_x, this.index_y], "New indices");
        this.sim.modal.footer("ok_cancel", function(e) {
            let new_indices = $("#singleInput").val();
            const modal = $("#myModalForm").data("bs.validator");

            modal.validate();
            if (modal.hasErrors() || modal.isIncomplete()) {
                return;
            }
            if (new_indices !== null) {
                new_indices = new_indices.split(",");
                this.update_indices(parseInt(new_indices[0], 10),
                                    parseInt(new_indices[1], 10));
                this.save_layout();
            }
            $("#OK").attr("data-dismiss", "modal");
        });
        $("#myModalForm").validator({
            custom: {
                my_validator: function($item) {
                    const nums = $item.val().split(",").map(Number);
                    return ((parseInt(nums[0], 10) === nums[0]) &&
                            (parseInt(nums[1], 10) === nums[1]) &&
                            (nums.length === 2) &&
                            (Number(nums[1]) < this.n_lines &&
                             Number(nums[1]) >= 0) &&
                            (Number(nums[0]) < this.n_lines &&
                             Number(nums[0]) >= 0));
                },
            },
        });

        $("#singleInput").attr(
            "data-error", "Input should be two positive " +
                "integers in the form '<dimension 1>,<dimension 2>'. " +
                "Dimensions are zero indexed.");

        this.sim.modal.show();
    };

    update_indices(index_x, index_y) {
        this.index_x = index_x;
        this.index_y = index_y;
        this.update();
    };

    reset() {
        this.data_store.reset();
        this.schedule_update();
    };

}
