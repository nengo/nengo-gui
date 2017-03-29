/**
 * Line graph showing semantic pointer decoded values over time.
 *
 * @constructor
 * @param {DOMElement} parent - the element to add this component to
 * @param {SimControl} sim - the simulation controller
 * @param {dict} args - A set of constructor arguments (see Component)
 * @param {int} args.n_lines - number of decoded values
 */

import * as d3 from "d3";
import * as $ from "jquery";

import { FlexibleDataStore } from "../datastore";
import * as utils from "../utils";
import { Component } from "./component";
import "./spa-similarity.css";
import { Value } from "./value";

export class SpaSimilarity extends Value {
    legendSVG;
    synapse;
    showPairs;

    constructor(parent, sim, args) {
        super(parent, sim, args);

        this.synapse = args.synapse;
        this.dataStore = new FlexibleDataStore(this.n_lines, this.synapse);
        this.showPairs = false;

        const self = this;

        this.colors = utils.makeColors(6);
        this.colorFunc = function(d, i) {
            return self.colors[i % 6];
        };

        this.line.defined(function(d) {
            return !isNaN(d);
        });

        // Create the legend from label args
        this.legendLabels = args.pointer_labels;
        this.legend = document.createElement("div");
        this.legend.classList.add("legend", "unselectable");
        this.div.appendChild(this.legend);
        this.legendSVG = utils.draw_legend(
            this.legend, args.pointer_labels, this.colorFunc, this.uid);
    };

    get n_lines(): number {
        return this.dataStore.dims;
    }

    reset_legend_and_data(new_labels) {
        // Clear the database and create a new one since dimensions have changed
        this.dataStore =
            new FlexibleDataStore(new_labels.length, this.synapse);

        // Delete the legend's children
        while (this.legend.lastChild) {
            this.legend.removeChild(this.legend.lastChild);
        }
        this.legendSVG = d3.select(this.legend)
            .append("svg")
            .attr("id", "legend" + this.uid);

        // Redraw all the legends if they exist
        this.legendLabels = [];
        if (new_labels[0] !== "") {
            this.update_legend(new_labels);
        }

        this.update();
    };

    data_msg(push_data) {
        this.dataStore.push(push_data);
        this.schedule_update(null);
    };

    update_legend(new_labels) {
        const self = this;
        this.legendLabels = this.legendLabels.concat(new_labels);

        // Expand the height of the svg, where 20-ish is the height of the font
        this.legendSVG.attr("height", 20 * this.legendLabels.length);

        // Data join
        const recs = this.legendSVG.selectAll("rect")
            .data(this.legendLabels);
        const legendLabels = this.legendSVG.selectAll(".legend-label")
            .data(this.legendLabels);
        const val_texts = this.legendSVG.selectAll(".val")
            .data(this.legendLabels);
        // Enter to append remaining lines
        recs.enter()
            .append("rect")
            .attr("x", 0)
            .attr("y", function(d, i) {
                return i * 20;
            })
            .attr("width", 10)
            .attr("height", 10)
            .style("fill", this.colorFunc);

        legendLabels.enter().append("text")
            .attr("x", 15)
            .attr("y", function(d, i) {
                return i * 20 + 9;
            })
            .attr("class", "legend-label")
            .html(function(d, i) {
                return self.legendLabels[i];
            });

        // Expand the width of the svg of the longest string
        const label_list = $("#legend" + this.uid + " .legend-label").toArray();
        const longest_label = Math.max.apply(Math, label_list.map(function(o) {
            return o.getBBox().width;
        }));
        // 50 is for the similarity measure that is around three characters wide
        const svg_right_edge = longest_label + 50;
        this.legendSVG.attr("width", svg_right_edge);

        val_texts.attr("x", svg_right_edge)
            .attr("y", function(d, i) {
                return i * 20 + 9;
            });
        val_texts.enter().append("text")
            .attr("x", svg_right_edge)
            .attr("y", function(d, i) {
                return i * 20 + 9;
            })
            .attr("text-anchor", "end")
            .attr("class", "val");
    };

    /**
     * Handle websocket messages.
     *
     * There are three types of messages that can be received:
     *   - a legend needs to be updated
     *   - the data has been updated
     *   - showPairs has been toggledn
     * This calls the method associated to handling the type of message.
     */
    on_message(event) {
        const data = JSON.parse(event.data);
        const func_name = data.shift();
        this[func_name](data);
    };

    /**
     * Redraw the lines and axis due to changed data.
     */
    update() {
        // Let the data store clear out old values
        this.dataStore.update();

        // Determine visible range from the SimControl
        const t1 = this.sim.time_slider.first_shown_time;
        const t2 = t1 + this.sim.time_slider.shown_time;

        this.axes2d.set_time_range(t1, t2);

        // Update the lines
        const self = this;
        const shown_data = this.dataStore.get_shown_data(this.sim.time_slider);


        // Update the legend text
        if (this.legendSVG && shown_data[0].length !== 0) {
            // Get the most recent similarity
            const latest_simi = [];
            for (let i = 0; i < shown_data.length; i++) {
                latest_simi.push(shown_data[i][shown_data[i].length - 1]);
            }

            // Update the text in the legend
            const texts = this.legendSVG.selectAll(".val")
                .data(this.legendLabels);

            texts.html(function(d, i) {
                let sign = "";
                if (latest_simi[i] < 0) {
                    sign = "&minus;";
                }
                return sign + Math.abs(latest_simi[i]).toFixed(2);
            });
        }
    };

    addMenuItems() {
        this.menu.addAction("Set range...", () => {
            this.setRange();
        });
        this.menu.addAction("Hide pairs", () => {
            this.set_showPairs(false);
        }, () => this.showPairs);
        this.menu.addAction("Show pairs", () => {
            this.set_showPairs(true);
        }, () => !this.showPairs);
        this.menu.addSeparator();
        // TODO: do we want super (Value) or Component?
        super.addMenuItems();
    };

    set_showPairs(value) {
        if (this.showPairs !== value) {
            this.showPairs = value;
            this.save_layout();
            this.ws.send(value);
        }
    };

    layout_info() {
        const info = Component.prototype.layout_info.call(this);
        info.showPairs = this.showPairs;
        info.min_value = this.axes2d.scale_y.domain()[0];
        info.max_value = this.axes2d.scale_y.domain()[1];
        return info;
    };

    update_layout(config) {
        this.update_range(config.min_value, config.max_value);
        this.showPairs = config.showPairs;
        Component.prototype.update_layout.call(this, config);
    };

    reset() {
        // Ask for a legend update
        this.ws.send("reset_legend");
    };

    // TODO: should I remove the ability to set range?
    // Or limit it to something intuitive

}
