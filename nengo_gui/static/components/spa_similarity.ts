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

import "./spa_similarity.css";
import { Component } from "./component";
import { GrowableDataStore } from "../datastore";
import * as utils from "../utils";
import Value from "./value";

export default class SpaSimilarity extends Value {

constructor(parent, viewport, sim, args) {
    super(parent, viewport, sim, args);

    this.synapse = args.synapse;
    this.data_store =
        new GrowableDataStore(this.n_lines, this.sim, this.synapse);
    this.show_pairs = false;

    var self = this;

    this.colors = utils.make_colors(6);
    this.color_func = function(d, i) {
        return self.colors[i % 6];
    };

    this.line.defined(function(d) {
        return !isNaN(d);
    });

    // Create the legend from label args
    this.legend_labels = args.pointer_labels;
    this.legend = document.createElement('div');
    this.legend.classList.add('legend', 'unselectable');
    this.div.appendChild(this.legend);
    this.legend_svg = utils.draw_legend(
        this.legend, args.pointer_labels, this.color_func, this.uid);
};

reset_legend_and_data(new_labels) {
    // Clear the database and create a new one since dimensions have changed
    this.data_store =
        new GrowableDataStore(new_labels.length, this.sim, this.synapse);

    // Delete the legend's children
    while (this.legend.lastChild) {
        this.legend.removeChild(this.legend.lastChild);
    }
    this.legend_svg = d3.select(this.legend)
        .append("svg")
        .attr("id", "legend" + this.uid);

    // Redraw all the legends if they exist
    this.legend_labels = [];
    if (new_labels[0] != "") {
        this.update_legend(new_labels);
    }

    this.update();
};

data_msg(push_data) {
    var data_dims = push_data.length - 1;

    // TODO: Move this check inside datastore?
    if (data_dims > this.data_store.dims) {
        this.data_store.dims = data_dims;
        this.n_lines = data_dims;
    }

    this.data_store.push(push_data);
    this.schedule_update();
};

update_legend(new_labels) {
    var self = this;
    this.legend_labels = this.legend_labels.concat(new_labels);

    // Expand the height of the svg, where 20 is around the height of the font
    this.legend_svg.attr("height", 20 * this.legend_labels.length);

    // Data join
    var recs = this.legend_svg.selectAll("rect")
        .data(this.legend_labels);
    var legend_labels = this.legend_svg.selectAll(".legend-label")
        .data(this.legend_labels);
    var val_texts = this.legend_svg.selectAll(".val").data(this.legend_labels);
    // Enter to append remaining lines
    recs.enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", function(d, i) {
            return i * 20;
        })
        .attr("width", 10)
        .attr("height", 10)
        .style("fill", this.color_func);

    legend_labels.enter().append("text")
        .attr("x", 15)
        .attr("y", function(d, i) {
            return i * 20 + 9;
        })
        .attr("class", "legend-label")
        .html(function(d, i) {
            return self.legend_labels[i];
        });

    // Expand the width of the svg of the longest string
    var label_list = $("#legend" + this.uid + " .legend-label").toArray();
    var longest_label = Math.max.apply(Math, label_list.map(function(o) {
        return o.getBBox().width;
    }));
    // 50 is for the similarity measure that is around three characters wide
    var svg_right_edge = longest_label + 50;
    this.legend_svg.attr("width", svg_right_edge);

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
 *   - show_pairs has been toggledn
 * This calls the method associated to handling the type of message.
 */
on_message(event) {
    var data = JSON.parse(event.data);
    var func_name = data.shift();
    this[func_name](data);
};

/**
 * Redraw the lines and axis due to changed data.
 */
update() {
    // Let the data store clear out old values
    this.data_store.update();

    // Determine visible range from the SimControl
    var t1 = this.sim.time_slider.first_shown_time;
    var t2 = t1 + this.sim.time_slider.shown_time;

    this.axes2d.set_time_range(t1, t2);

    // Update the lines
    var self = this;
    var shown_data = this.data_store.get_shown_data();
    // Data join
    this.path = this.axes2d.svg.selectAll(".line").data(shown_data);
    // Update
    this.path.attr('d', self.line);
    // Enter to append remaining lines
    this.path.enter()
             .append('path')
             .attr('class', 'line')
             .style('stroke', this.color_func)
             .attr('d', self.line);
    // Remove any lines that aren't needed anymore
    this.path.exit().remove();

    // Update the legend text
    if (this.legend_svg && shown_data[0].length !== 0) {
        // Get the most recent similarity
        var latest_simi = [];
        for (var i = 0; i < shown_data.length; i++) {
            latest_simi.push(shown_data[i][shown_data[i].length - 1]);
        }

        // Update the text in the legend
        var texts = this.legend_svg.selectAll(".val").data(this.legend_labels);

        texts.html(function(d, i) {
            var sign = '';
            if (latest_simi[i] < 0) {
                sign = "&minus;";
            }
            return sign + Math.abs(latest_simi[i]).toFixed(2);
        });
    }
};

generate_menu() {
    var self = this;
    var items = [];
    items.push(['Set range...', function() {
        self.set_range();
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
    return $.merge(items, Component.prototype.generate_menu.call(this));
};

set_show_pairs(value) {
    if (this.show_pairs !== value) {
        this.show_pairs = value;
        this.save_layout();
        this.ws.send(value);
    }
};

layout_info() {
    var info = Component.prototype.layout_info.call(this);
    info.show_pairs = this.show_pairs;
    info.min_value = this.axes2d.scale_y.domain()[0];
    info.max_value = this.axes2d.scale_y.domain()[1];
    return info;
};

update_layout(config) {
    this.update_range(config.min_value, config.max_value);
    this.show_pairs = config.show_pairs;
    Component.prototype.update_layout.call(this, config);
};

reset() {
    // Ask for a legend update
    this.ws.send("reset_legend");
};

// TODO: should I remove the ability to set range?
// Or limit it to something intuitive

}
