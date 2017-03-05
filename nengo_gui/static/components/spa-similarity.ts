/**
 * Line graph showing semantic pointer decoded values over time.
 *
 * @constructor
 * @param {DOMElement} parent - the element to add this component to
 * @param {SimControl} sim - the simulation controller
 * @param {dict} args - A set of constructor arguments (see Component)
 * @param {int} args.nLines - number of decoded values
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
    _showPairs: boolean;

    constructor(parent, sim, args) {
        super(parent, sim, args);

        this.synapse = args.synapse;
        this.dataStore = new FlexibleDataStore(this.nLines, this.synapse);
        this._showPairs = false;

        this.colors = utils.makeColors(6);
        this.colorFunc = (d, i) => {
            return this.colors[i % 6];
        };

        this.line.defined((d) => {
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

    resetLegendAndData(newLabels) {
        // Clear the database and create a new one since dimensions have changed
        this.dataStore = new FlexibleDataStore(newLabels.length, this.synapse);

        // Delete the legend's children
        while (this.legend.lastChild) {
            this.legend.removeChild(this.legend.lastChild);
        }
        this.legendSVG = d3.select(this.legend)
            .append("svg")
            .attr("id", "legend" + this.uid);

        // Redraw all the legends if they exist
        this.legendLabels = [];
        if (newLabels[0] !== "") {
            this.updateLegend(newLabels);
        }

        this.update();
    }

    dataMsg(pushData) {
        this.dataStore.push(pushData);
        this.scheduleUpdate(null);
    }

    updateLegend(newLabels) {
        this.legendLabels = this.legendLabels.concat(newLabels);

        // Expand the height of the svg, where 20-ish is the height of the font
        this.legendSVG.attr("height", 20 * this.legendLabels.length);

        // Data join
        const recs = this.legendSVG.selectAll("rect")
            .data(this.legendLabels);
        const legendLabels = this.legendSVG.selectAll(".legend-label")
            .data(this.legendLabels);
        const valTexts = this.legendSVG.selectAll(".val")
            .data(this.legendLabels);
        // Enter to append remaining lines
        recs.enter()
            .append("rect")
            .attr("x", 0)
            .attr("y", (d, i) => {
                return i * 20;
            })
            .attr("width", 10)
            .attr("height", 10)
            .style("fill", this.colorFunc);

        legendLabels.enter().append("text")
            .attr("x", 15)
            .attr("y", (d, i) => {
                return i * 20 + 9;
            })
            .attr("class", "legend-label")
            .html((d, i) => {
                return this.legendLabels[i];
            });

        // Expand the width of the svg of the longest string
        const labelList = $("#legend" + this.uid + " .legend-label").toArray();
        const longestLabel = Math.max.apply(Math, labelList.map((o) => {
            return o.getBoundingClientRect().width;
        }));
        // 50 is for the similarity measure that is around three characters wide
        const svgRightEdge = longestLabel + 50;
        this.legendSVG.attr("width", svgRightEdge);

        valTexts.attr("x", svgRightEdge)
            .attr("y", (d, i) => {
                return i * 20 + 9;
            });
        valTexts.enter().append("text")
            .attr("x", svgRightEdge)
            .attr("y", (d, i) => {
                return i * 20 + 9;
            })
            .attr("text-anchor", "end")
            .attr("class", "val");
    }

    /**
     * Handle websocket messages.
     *
     * There are three types of messages that can be received:
     *   - a legend needs to be updated
     *   - the data has been updated
     *   - showPairs has been toggledn
     * This calls the method associated to handling the type of message.
     */
    onMessage(event) {
        const data = JSON.parse(event.data);
        const funcName =  data.shift();
        this[funcName](data);
    }

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
        const shownData = this.dataStore.getShownData(this.sim.time_slider);

        // Update the legend text
        if (this.legendSVG && shownData[0].length !== 0) {
            // Get the most recent similarity
            const latestSimi = [];
            for (let i = 0; i < shownData.length; i++) {
                latestSimi.push(shownData[i][shownData[i].length - 1]);
            }

            // Update the text in the legend
            const texts = this.legendSVG.selectAll(".val")
                .data(this.legendLabels);

            texts.html((d, i) => {
                let sign = "";
                if (lastestSimi[i] < 0) {
                    sign = "&minus;";
                }
                return sign + Math.abs(lastestSimi[i]).toFixed(2);
            });
        }
    }

    addMenuItems() {
        this.menu.addAction("Set range...", () => {
            this.setRange();
        });
        this.menu.addAction("Hide pairs", () => {
            this.showPairs = false;
        }, () => this.showPairs);
        this.menu.addAction("Show pairs", () => {
            this.showPairs = true;
        }, () => !this.showPairs);
        this.menu.addSeparator();
        // TODO: do we want super (Value) or Component?
        super.addMenuItems();
    };

    set showPairs(value) {
        if (this._showPairs !== value) {
            this._showPairs = value;
            this.saveLayout();
            this.ws.send(value);
        }
    }

    layoutInfo() {
        const info = Component.prototype.layoutInfo.call(this);
        info.show_pairs = this._showPairs;
        info.min_value = this.axes2d.scale_y.domain()[0];
        info.max_value = this.axes2d.scale_y.domain()[1];
        return info;
    }

    updateLayout(config) {
        this.updateRange(config.min_value, config.max_value);
        this.showPairs = config.show_pairs;
        Component.prototype.updateLayout.call(this, config);
    }

    reset() {
        // Ask for a legend update
        this.ws.send("reset_legend");
    }

    // TODO: should I remove the ability to set range?
    // Or limit it to something intuitive

}
