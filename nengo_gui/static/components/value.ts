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
import { InputDialogView } from "../views/modal";
import { Component } from "./component";
import { TimeAxes } from "./time-axes";
import "./value.css";

export class Value extends Component {
    axes2d;
    colorFunc;
    colors;
    crosshairG;
    crosshairMouse;
    crosshairUpdates;
    dataStore;
    displayTime;
    legend;
    legendLabels;
    line;
    nLines;
    path;
    showLegend;
    sim;
    synapse;

    constructor(parent, sim, args) {
        super(parent, args);

        this.nLines = args.nLines || 1;
        this.sim = sim;
        this.displayTime = args.displayTime;
        this.synapse = args.synapse;

        // For storing the accumulated data
        this.dataStore = new DataStore(this.nLines, this.sim, 0.0);

        this.axes2d = new TimeAxes(this.div, args);

        // Call scheduleUpdate whenever the time is adjusted in the SimControl
        this.sim.timeSlider.div.addEventListener("adjustTime", e => {
            this.scheduleUpdate();
        });

        // Call reset whenever the simulation is reset
        this.sim.div.addEventListener("resetSim", e => {
            this.reset();
        });

        // Create the lines on the plots
        this.line = d3.svg.line()
            .x(function(d, i) {
                return this.axes2d.scaleX(
                    this.dataStore.times[i + this.dataStore.firstShownIndex]
                );
            }).y(function(d) {
                return this.axes2d.scaleY(d);
            });
        this.path = this.axes2d.svg.append("g")
            .selectAll("path")
            .data(this.dataStore.data);

        this.colors = utils.makeColors(this.nLines);
        this.path.enter()
            .append("path")
            .attr("class", "line")
            .style("stroke", function(d, i) {
                return this.colors[i];
            });

        // Flag for whether or not update code should be changing the crosshair.
        // Both zooming and the simulator time changing cause an update, but the
        // crosshair should only update when the time is changing.
        this.crosshairUpdates = false;

        // Keep track of mouse position TODO: fix this to be not required
        this.crosshairMouse = [0, 0];

        this.crosshairG = this.axes2d.svg.append("g")
            .attr("class", "crosshair");

        // TODO: put the crosshair properties in CSS
        this.crosshairG.append("line")
            .attr("id", "crosshairX")
            .attr("stroke", "black")
            .attr("stroke-width", "0.5px");

        this.crosshairG.append("line")
            .attr("id", "crosshairY")
            .attr("stroke", "black")
            .attr("stroke-width", "0.5px");

        // TODO: have the fonts and colour set appropriately
        this.crosshairG.append("text")
            .attr("id", "crosshairXtext")
            .style("text-anchor", "middle")
            .attr("class", "graphText");

        this.crosshairG.append("text")
            .attr("id", "crosshairYtext")
            .style("text-anchor", "end")
            .attr("class", "graphText");

        this.axes2d.svg
            .on("mouseover", function() {
                const mouse = d3.mouse(this);
                this.crosshairUpdates = true;
                this.crosshairG.style("display", null);
                this.crosshairMouse = [mouse[0], mouse[1]];
            }).on("mouseout", function() {
                const mouse = d3.mouse(this);
                this.crosshairUpdates = false;
                this.crosshairG.style("display", "none");
                this.crosshairMouse = [mouse[0], mouse[1]];
            }).on("mousemove", function() {
                const mouse = d3.mouse(this);
                this.crosshairUpdates = true;
                this.crosshairMouse = [mouse[0], mouse[1]];
                this.updateCrosshair(mouse);
            }).on("mousewheel", function() {
                // Hide the crosshair when zooming,
                // until a better option comes along
                this.crosshairUpdates = false;
                this.crosshairG.style("display", "none");
            });

        this.update();
        this.onResize(
            viewport.scaleWidth(this.w), viewport.scaleHeight(this.h));
        this.axes2d.axisY.tickValues([args.minValue, args.maxValue]);
        this.axes2d.fitTicks(this);

        this.colors = utils.makeColors(6);
        this.colorFunc = function(d, i) {
            return this.colors[i % 6];
        };
        this.legend = document.createElement("div");
        this.legend.classList.add("legend");
        this.div.appendChild(this.legend);

        this.legendLabels = args.legendLabels || [];
        if (this.legendLabels.length !== this.nLines) {
            // Fill up the array with temporary labels
            for (let i = this.legendLabels.length; i < this.nLines; i++) {
                this.legendLabels[i] = "label_" + i;
            }
        }

        this.showLegend = args.showLegend || false;
        if (this.showLegend === true) {
            // utils.drawLegend(this.legend,
            //                   this.legendLabels.slice(0, this.nLines),
            //                   this.colorFunc,
            //                   this.uid);
        }
    }

    updateCrosshair(mouse) {
        const {x, y} = mouse;

        // TODO: I don't like having ifs here.
        //       Make a smaller rectangle for mouseovers
        if (x > this.axes2d.axLeft && x < this.axes2d.axRight &&
            y > this.axes2d.axTop && y < this.axes2d.axBottom) {
            this.crosshairG.style("display", null);

            this.crosshairG.select("#crosshairX")
                .attr("x1", x)
                .attr("y1", this.axes2d.axTop)
                .attr("x2", x)
                .attr("y2", this.axes2d.axBottom);

            this.crosshairG.select("#crosshairY")
                .attr("x1", this.axes2d.axLeft)
                .attr("y1", y)
                .attr("x2", this.axes2d.axRight)
                .attr("y2", y);

            // TODO: don't use magic numbers
            this.crosshairG.select("#crosshairXtext")
                .attr("x", x - 2)
                .attr("y", this.axes2d.axBottom + 17)
                .text(function() {
                    return Math.round(
                        this.axes2d.scaleX.invert(x) * 100) / 100;
                });

            this.crosshairG.select("#crosshairYtext")
                .attr("x", this.axes2d.axLeft - 3)
                .attr("y", y + 3)
                .text(function() {
                    return Math.round(
                        this.axes2d.scaleY.invert(y) * 100) / 100;
                });
        } else {
            this.crosshairG.style("display", "none");
        }
    }

    /**
     * Receive new line data from the server.
     */
    onMessage(event) {
        let data = new Float32Array(event.data);
        data = Array.prototype.slice.call(data);
        const size = this.nLines + 1;
        // Since multiple data packets can be sent with a single event,
        // make sure to process all the packets.
        while (data.length >= size) {
            this.dataStore.push(data.slice(0, size));
            data = data.slice(size);
        }
        if (data.length > 0) {
            console.warn("extra data: " + data.length);
        }
        this.scheduleUpdate();
    }

    /**
     * Redraw the lines and axis due to changed data.
     */
    update() {
        // Let the data store clear out old values
        this.dataStore.update();

        // Determine visible range from the SimControl
        const t1 = this.sim.timeSlider.firstShownTime;
        const t2 = t1 + this.sim.timeSlider.shownTime;

        this.axes2d.setTimeRange(t1, t2);

        // Update the lines
        const shownData = this.dataStore.getShownData();

        this.path.data(shownData)
            .attr("d", this.line);

        // Update the crosshair text if the mouse is on top
        if (this.crosshairUpdates) {
            this.updateCrosshair(this.crosshairMouse);
        }
    }

    /**
     * Adjust the graph layout due to changed size.
     */
    onResize(width, height) {
        if (width < this.minWidth) {
            width = this.minWidth;
        }
        if (height < this.minHeight) {
            height = this.minHeight;
        }

        this.axes2d.onResize(width, height);

        this.update();

        this.label.style.width = width;

        this.width = width;
        this.height = height;
        this.div.style.width = width;
        this.div.style.height = height;
    }

    generateMenu() {
        const items = [
            ["Set range...", function() {
                this.setRange();
            }],
            ["Set synapse...", function() {
                this.setSynapseDialog();
            }],
        ];

        if (this.showLegend) {
            items.push(["Hide legend", function() {
                this.setShowLegend(false);
            }]);
        } else {
            items.push(["Show legend", function() {
                this.setShowLegend(true);
            }]);
        }

        // TODO: give the legend it's own context menu
        items.push(["Set legend labels", function() {
            this.setLegendLabels();
        }]);

        // Add the parent's menu items to this
        return $.merge(items, Component.prototype.generateMenu.call(this));
    }

    setShowLegend(value) {
        if (this.showLegend !== value) {
            this.showLegend = value;
            this.saveLayout();

            if (this.showLegend === true) {
                // utils.drawLegend(this.legend,
                //                   this.legendLabels.slice(0, this.nLines),
                //                   this.colorFunc,
                //                   this.uid);
            } else {
                // Delete the legend's children
                while (this.legend.lastChild) {
                    this.legend.removeChild(this.legend.lastChild);
                }
            }
        }
    }

    setLegendLabels() {
        const modal = new InputDialogView("Legend label", "New value");
        modal.title = "Enter comma seperated legend label values";
        const okButton = modal.addFooterButton("OK");
        modal.addCloseButton("Cancel");
        okButton.addEventListener("click", () => {
            const labelCsv = modal.input.value;

            // No validation to do.
            // Empty entries assumed to be indication to skip modification.
            // Long strings okay.
            // Excissive entries get ignored.
            // TODO: Allow escaping of commas
            if ((labelCsv !== null) && (labelCsv !== "")) {
                const labels = labelCsv.split(",");

                for (let i = 0; i < this.nLines; i++) {
                    if (labels[i] !== "" && labels[i] !== undefined) {
                        this.legendLabels[i] = labels[i];
                    }
                }

                // Redraw the legend with the updated label values
                while (this.legend.lastChild) {
                    this.legend.removeChild(this.legend.lastChild);
                }

                // utils.drawLegend(this.legend,
                //                   this.legendLabels,
                //                   this.colorFunc,
                //                   this.uid);
                this.saveLayout();
            }
            // Set the data-dismiss attribute and let event propagate
            okButton.setAttribute("data-dismiss", "modal");
        });
        modal.show();
    }

    layoutInfo() {
        const info = Component.prototype.layoutInfo.call(this);
        info.showLegend = this.showLegend;
        info.legendLabels = this.legendLabels;
        info.minValue = this.axes2d.scaleY.domain()[0];
        info.maxValue = this.axes2d.scaleY.domain()[1];
        return info;
    }

    updateLayout(config) {
        this.updateRange(config.minValue, config.maxValue);
        Component.prototype.updateLayout.call(this, config);
    }

    setRange() {
        const range = this.axes2d.scaleY.domain();
        const modal = new InputDialogView(
            range, "New range", "Input should be in the form '<min>,<max>'."
        );
        modal.title = "Set graph range...";
        const okButton = modal.addFooterButton("OK");
        modal.addCloseButton("Cancel");
        okButton.addEventListener("click", () => {
            const validator = $(modal).data("bs.validator");
            validator.validate();
            if (validator.hasErrors() || validator.isIncomplete()) {
                return;
            }
            if (modal.input.value !== null) {
                const newRange = modal.input.value.split(",");
                const min = parseFloat(newRange[0]);
                const max = parseFloat(newRange[1]);
                this.updateRange(min, max);
                this.saveLayout();
                this.axes2d.axisY.tickValues([min, max]);
                this.axes2d.fitTicks(this);
            }
            // Set the data-dismiss attribute and let event propagate
            okButton.setAttribute("data-dismiss", "modal");

            // TODO: this was a separate handler before, but should only
            //       fire when validation passes right?
            this.onResize(this.div.clientWidth, this.div.clienHeight);
        });

        $(modal).validator({
            custom: {
                ngvalidator: item => {
                    const nums = item.value.split(",");
                    let valid = false;
                    if (utils.isNum(nums[0]) && utils.isNum(nums[1])) {
                        // Two numbers, 1st less than 2nd
                        if (Number(nums[0]) < Number(nums[1])) {
                            valid = true;
                        }
                    }
                    return (nums.length === 2 && valid);
                },
            },
        });
        modal.show();
    }

    updateRange(min, max) {
        this.axes2d.scaleY.domain([min, max]);
        this.axes2d.axisY_g.call(this.axes2d.axisY);
    }

    reset() {
        this.dataStore.reset();
        this.scheduleUpdate();
    }

    setSynapseDialog() {
        const modal = new InputDialogView(
            this.synapse, "Filter time constant (in seconds)",
            "Input should be a non-negative number"
        );
        modal.title = "Set synaptic filter...";
        const okButton = modal.addFooterButton("OK");
        modal.addCloseButton("Cancel");
        okButton.addEventListener("click", () => {
            const validator = $(modal).data("bs.validator");
            validator.validate();
            if (validator.hasErrors() || validator.isIncomplete()) {
                return;
            }
            if (modal.input.value !== null) {
                const newSynapse = parseFloat(modal.input.value);
                if (newSynapse !== this.synapse) {
                    this.synapse = newSynapse;
                    this.ws.send("synapse:" + this.synapse);
                }
            }
            // Set the data-dismiss attribute and let event propagate
            okButton.setAttribute("data-dismiss", "modal");
        });

        $(modal).validator({
            custom: {
                ngvalidator: item => {
                    return utils.isNum(item.value) && Number(item.value) >= 0;
                },
            },
        });
        modal.show();
    }
}
