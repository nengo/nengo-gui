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
import { InputDialogView } from "../views/modal";
import { Component } from "./component";
import "./raster.css";
import { TimeAxes } from "./time-axes";

export class Raster extends Component {
    axes2d;
    dataStore;
    nNeurons;
    path;
    sim;

    constructor(parent, sim, args) {
        super(parent, args);
        this.nNeurons = args.nNeurons || 1;
        this.sim = sim;

        // For storing the accumulated data
        this.dataStore = new DataStore(1, this.sim, 0);

        this.axes2d = new TimeAxes(this.div, args);
        this.axes2d.scaleY.domain([0, args.nNeurons]);

        // Call scheduleUpdate whenever the time is adjusted in the SimControl
        this.sim.timeSlider.div.addEventListener("adjustTime", e => {
            this.scheduleUpdate();
        });

        // Call reset whenever the simulation is reset
        this.sim.div.addEventListener("resetSim", e => {
            this.reset();
        });

        // Create the lines on the plots
        d3.svg.line()
            .x(function(d, i) {
                return this.axes2d.scaleX(this.dataStore.times[i]);
            })
            .y(function(d) {
                return this.axes2d.scaleY(d);
            });

        this.path = this.axes2d.svg.append("g")
            .selectAll("path")
            .data(this.dataStore.data);

        this.path.enter().append("path")
            .attr("class", "line")
            .style("stroke", utils.makeColors(1));

        this.update();
        this.onResize(
            viewport.scaleWidth(this.w), viewport.scaleHeight(this.h));
        this.axes2d.axisY.tickValues([0, args.nNeurons]);
        this.axes2d.fitTicks(this);
    }

    /**
     * Receive new line data from the server.
     */
    onMessage(event) {
        const time = new Float32Array(event.data, 0, 1);
        const data = new Int16Array(event.data, 4);
        this.dataStore.push([time[0], data]);
        this.scheduleUpdate();
    }

    setN_neurons(nNeurons) {
        this.nNeurons = nNeurons;
        this.axes2d.scaleY.domain([0, nNeurons]);
        this.axes2d.axisY.tickValues([0, nNeurons]);
        this.ws.send("nNeurons:" + nNeurons);
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

        const path = [];
        for (let i = 0; i < shownData[0].length; i++) {
            const t = this.axes2d.scaleX(
                this.dataStore.times[
                    this.dataStore.firstShownIndex + i]);

            for (let j = 0; j < shownData[0][i].length; j++) {
                const y1 = this.axes2d.scaleY(shownData[0][i][j]);
                const y2 = this.axes2d.scaleY(shownData[0][i][j] + 1);
                path.push("M " + t + " " + y1 + "V" + y2);
            }
        }
        this.path.attr("d", path.join(""));
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

    reset() {
        this.dataStore.reset();
        this.scheduleUpdate();
    }

    addMenuItems() {
        this.menu.addAction("Set # neurons...", () => {
            this.setNeuronCount();
        });
        this.menu.addSeparator();
        super.addMenuItems();
    }

    setNeuronCount() {
        const count = this.nNeurons;
        const modal = new InputDialogView(
            count, "Number of neurons", "Input should be a positive integer"
        );
        modal.title = "Set number of neurons...";
        modal.ok.addEventListener("click", () => {
            const validator = $(modal).data("bs.validator");
            validator.validate();
            if (validator.hasErrors() || validator.isIncomplete()) {
                return;
            }
            if (modal.input.value !== null) {
                const newCount = parseInt(modal.input.value, 10);
                this.setN_neurons(newCount);
                this.axes2d.fitTicks(this);
            }
            // TODO: this was a separate handler before, but should only
            //       fire when validation passes right?
            this.onResize(this.div.clientWidth, this.div.clienHeight);

            $(modal).modal("hide");
        });
        this.addKeyHandler(modal);

        $(modal).validator({
            custom: {
                ngvalidator: item => {
                    return utils.isInt(item.value);
                },
            },
        });
        modal.show();
    }
}
