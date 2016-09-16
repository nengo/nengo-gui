/**
 * Line graph showing decoded values over time
 *
 * Value constructor is called by python server when a user requests a plot
 * or when the config file is making graphs. Server request is handled in
 * netgraph.js {.on_message} function.
 *
 * @constructor
 * @param {DOMElement} parent - the element to add this component to
 * @param {SimControl} sim - the simulation controller
 * @param {dict} args - A set of constructor arguments (see Component)
 * @param {int} args.n_lines - number of decoded values
 * @param {float} args.min_value - minimum value on y-axis
 * @param {float} args.max_value - maximum value on y-axis
 */

import * as d3 from "d3";
import * as $ from "jquery";

import { DataStore } from "../datastore";
import * as utils from "../utils";
import * as viewport from "../viewport";
import { Component } from "./component";
import { TimeAxes } from "./time_axes";
import "./value.css";

export class Value extends Component {
    axes2d;
    color_func;
    colors;
    crosshair_g;
    crosshair_mouse;
    crosshair_updates;
    data_store;
    display_time;
    legend;
    legend_labels;
    line;
    n_lines;
    path;
    show_legend;
    sim;
    synapse;

    constructor(parent, sim, args) {
        super(parent, args);

        this.n_lines = args.n_lines || 1;
        this.sim = sim;
        this.display_time = args.display_time;
        this.synapse = args.synapse;

        // For storing the accumulated data
        this.data_store = new DataStore(this.n_lines, this.sim, 0.0);

        this.axes2d = new TimeAxes(this.div, args);

        // Call schedule_update whenever the time is adjusted in the SimControl
        this.sim.time_slider.div.addEventListener("adjust_time", e => {
            this.schedule_update();
        });

        // Call reset whenever the simulation is reset
        this.sim.div.addEventListener("reset_sim", e => {
            this.reset();
        });

        // Create the lines on the plots
        this.line = d3.svg.line()
            .x(function(d, i) {
                return this.axes2d.scale_x(
                    this.data_store.times[i + this.data_store.first_shown_index]
                );
            }).y(function(d) {
                return this.axes2d.scale_y(d);
            });
        this.path = this.axes2d.svg.append("g")
            .selectAll("path")
            .data(this.data_store.data);

        this.colors = utils.make_colors(this.n_lines);
        this.path.enter()
            .append("path")
            .attr("class", "line")
            .style("stroke", function(d, i) {
                return this.colors[i];
            });

        // Flag for whether or not update code should be changing the crosshair.
        // Both zooming and the simulator time changing cause an update, but the
        // crosshair should only update when the time is changing.
        this.crosshair_updates = false;

        // Keep track of mouse position TODO: fix this to be not required
        this.crosshair_mouse = [0, 0];

        this.crosshair_g = this.axes2d.svg.append("g")
            .attr("class", "crosshair");

        // TODO: put the crosshair properties in CSS
        this.crosshair_g.append("line")
            .attr("id", "crosshairX")
            .attr("stroke", "black")
            .attr("stroke-width", "0.5px");

        this.crosshair_g.append("line")
            .attr("id", "crosshairY")
            .attr("stroke", "black")
            .attr("stroke-width", "0.5px");

        // TODO: have the fonts and colour set appropriately
        this.crosshair_g.append("text")
            .attr("id", "crosshairXtext")
            .style("text-anchor", "middle")
            .attr("class", "graph_text");

        this.crosshair_g.append("text")
            .attr("id", "crosshairYtext")
            .style("text-anchor", "end")
            .attr("class", "graph_text");

        this.axes2d.svg
            .on("mouseover", function() {
                const mouse = d3.mouse(this);
                this.crosshair_updates = true;
                this.crosshair_g.style("display", null);
                this.crosshair_mouse = [mouse[0], mouse[1]];
            }).on("mouseout", function() {
                const mouse = d3.mouse(this);
                this.crosshair_updates = false;
                this.crosshair_g.style("display", "none");
                this.crosshair_mouse = [mouse[0], mouse[1]];
            }).on("mousemove", function() {
                const mouse = d3.mouse(this);
                this.crosshair_updates = true;
                this.crosshair_mouse = [mouse[0], mouse[1]];
                this.update_crosshair(mouse);
            }).on("mousewheel", function() {
                // Hide the crosshair when zooming,
                // until a better option comes along
                this.crosshair_updates = false;
                this.crosshair_g.style("display", "none");
            });

        this.update();
        this.on_resize(
            viewport.scale_width(this.w), viewport.scale_height(this.h));
        this.axes2d.axis_y.tickValues([args.min_value, args.max_value]);
        this.axes2d.fit_ticks(this);

        this.colors = utils.make_colors(6);
        this.color_func = function(d, i) {
            return this.colors[i % 6];
        };
        this.legend = document.createElement("div");
        this.legend.classList.add("legend");
        this.div.appendChild(this.legend);

        this.legend_labels = args.legend_labels || [];
        if (this.legend_labels.length !== this.n_lines) {
            // Fill up the array with temporary labels
            for (let i = this.legend_labels.length; i < this.n_lines; i++) {
                this.legend_labels[i] = "label_" + i;
            }
        }

        this.show_legend = args.show_legend || false;
        if (this.show_legend === true) {
            utils.draw_legend(this.legend,
                              this.legend_labels.slice(0, this.n_lines),
                              this.color_func,
                              this.uid);
        }
    };

    update_crosshair(mouse) {
        const {x, y} = mouse;

        // TODO: I don't like having ifs here.
        //       Make a smaller rectangle for mouseovers
        if (x > this.axes2d.ax_left && x < this.axes2d.ax_right &&
            y > this.axes2d.ax_top && y < this.axes2d.ax_bottom) {
            this.crosshair_g.style("display", null);

            this.crosshair_g.select("#crosshairX")
                .attr("x1", x)
                .attr("y1", this.axes2d.ax_top)
                .attr("x2", x)
                .attr("y2", this.axes2d.ax_bottom);

            this.crosshair_g.select("#crosshairY")
                .attr("x1", this.axes2d.ax_left)
                .attr("y1", y)
                .attr("x2", this.axes2d.ax_right)
                .attr("y2", y);

            // TODO: don't use magic numbers
            this.crosshair_g.select("#crosshairXtext")
                .attr("x", x - 2)
                .attr("y", this.axes2d.ax_bottom + 17)
                .text(function() {
                    return Math.round(
                        this.axes2d.scale_x.invert(x) * 100) / 100;
                });

            this.crosshair_g.select("#crosshairYtext")
                .attr("x", this.axes2d.ax_left - 3)
                .attr("y", y + 3)
                .text(function() {
                    return Math.round(
                        this.axes2d.scale_y.invert(y) * 100) / 100;
                });
        } else {
            this.crosshair_g.style("display", "none");
        }
    };

    /**
     * Receive new line data from the server.
     */
    on_message(event) {
        let data = new Float32Array(event.data);
        data = Array.prototype.slice.call(data);
        const size = this.n_lines + 1;
        // Since multiple data packets can be sent with a single event,
        // make sure to process all the packets.
        while (data.length >= size) {
            this.data_store.push(data.slice(0, size));
            data = data.slice(size);
        }
        if (data.length > 0) {
            console.warn("extra data: " + data.length);
        }
        this.schedule_update();
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

        this.path.data(shown_data)
            .attr("d", this.line);

        // Update the crosshair text if the mouse is on top
        if (this.crosshair_updates) {
            this.update_crosshair(this.crosshair_mouse);
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

        this.axes2d.on_resize(width, height);

        this.update();

        this.label.style.width = width;

        this.width = width;
        this.height = height;
        this.div.style.width = width;
        this.div.style.height = height;
    };

    generate_menu() {
        const items = [
            ["Set range...", function() {
                this.set_range();
            }],
            ["Set synapse...", function() {
                this.set_synapse_dialog();
            }],
        ];

        if (this.show_legend) {
            items.push(["Hide legend", function() {
                this.set_show_legend(false);
            }]);
        } else {
            items.push(["Show legend", function() {
                this.set_show_legend(true);
            }]);
        }

        // TODO: give the legend it's own context menu
        items.push(["Set legend labels", function() {
            this.set_legend_labels();
        }]);

        // Add the parent's menu items to this
        return $.merge(items, Component.prototype.generate_menu.call(this));
    };

    set_show_legend(value) {
        if (this.show_legend !== value) {
            this.show_legend = value;
            this.save_layout();

            if (this.show_legend === true) {
                utils.draw_legend(this.legend,
                                  this.legend_labels.slice(0, this.n_lines),
                                  this.color_func,
                                  this.uid);
            } else {
                // Delete the legend's children
                while (this.legend.lastChild) {
                    this.legend.removeChild(this.legend.lastChild);
                }
            }
        }
    };

    set_legend_labels() {
        this.sim.modal.title("Enter comma seperated legend label values");
        this.sim.modal.single_input_body("Legend label", "New value");
        this.sim.modal.footer("ok_cancel", function(e) {
            const label_csv = $("#singleInput").val();
            $("#myModalForm").data("bs.validator");

            // No validation to do.
            // Empty entries assumed to be indication to skip modification.
            // Long strings okay.
            // Excissive entries get ignored.
            // TODO: Allow escaping of commas
            if ((label_csv !== null) && (label_csv !== "")) {
                const labels = label_csv.split(",");

                for (let i = 0; i < this.n_lines; i++) {
                    if (labels[i] !== "" && labels[i] !== undefined) {
                        this.legend_labels[i] = labels[i];
                    }
                }

                // Redraw the legend with the updated label values
                while (this.legend.lastChild) {
                    this.legend.removeChild(this.legend.lastChild);
                }

                utils.draw_legend(this.legend,
                                  this.legend_labels,
                                  this.color_func,
                                  this.uid);
                this.save_layout();
            }
            $("#OK").attr("data-dismiss", "modal");
        });

        this.sim.modal.show();
    };

    layout_info() {
        const info = Component.prototype.layout_info.call(this);
        info.show_legend = this.show_legend;
        info.legend_labels = this.legend_labels;
        info.min_value = this.axes2d.scale_y.domain()[0];
        info.max_value = this.axes2d.scale_y.domain()[1];
        return info;
    };

    update_layout(config) {
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
                this.save_layout();
                this.axes2d.axis_y.tickValues([min, max]);
                this.axes2d.fit_ticks(this);
            }
            $("#OK").attr("data-dismiss", "modal");
        });
        $("#myModalForm").validator({
            custom: {
                my_validator: function($item) {
                    const nums = $item.val().split(",");
                    let valid = false;
                    if ($.isNumeric(nums[0]) && $.isNumeric(nums[1])) {
                        if (Number(nums[0]) < Number(nums[1])) {
                            valid = true; // Two numbers, 1st less than 2nd
                        }
                    }
                    return (nums.length === 2 && valid);
                },
            },
        });

        $("#singleInput").attr("data-error", "Input should be in the " +
                               "form '<min>,<max>'.");
        this.sim.modal.show();
        $("#OK").on("click", function() {
            const div = $(this.div);
            this.on_resize(div.width(), div.height());
        });
    };

    update_range(min, max) {
        this.axes2d.scale_y.domain([min, max]);
        this.axes2d.axis_y_g.call(this.axes2d.axis_y);
    };

    reset() {
        this.data_store.reset();
        this.schedule_update();
    };

    set_synapse_dialog() {
        this.sim.modal.title("Set synaptic filter...");
        this.sim.modal.single_input_body(this.synapse,
                                         "Filter time constant (in seconds)");
        this.sim.modal.footer("ok_cancel", function(e) {
            let new_synapse = $("#singleInput").val();
            const modal = $("#myModalForm").data("bs.validator");
            modal.validate();
            if (modal.hasErrors() || modal.isIncomplete()) {
                return;
            }
            if (new_synapse !== null) {
                new_synapse = parseFloat(new_synapse);
                if (new_synapse === this.synapse) {
                    return;
                }
                this.synapse = new_synapse;
                this.ws.send("synapse:" + this.synapse);
            }
            $("#OK").attr("data-dismiss", "modal");
        });
        $("#myModalForm").validator({
            custom: {
                my_validator: function($item) {
                    let num = $item.val();
                    if ($.isNumeric(num)) {
                        num = Number(num);
                        if (num >= 0) {
                            return true;
                        }
                    }
                    return false;
                },
            },
        });
        $("#singleInput").attr("data-error", "should be a non-negative number");
        this.sim.modal.show();
    };

}
