/**
 * Arbitrary HTML display taking input from a Node
 * See nengo_gui/examples/basics/html.py for example usage.
 *
 * @constructor
 * @param {DOMElement} parent - the element to add this component to
 * @param {SimControl} sim - the simulation controller
 * @param {dict} args - A set of constructor arguments (see Component)
 */

import { DataStore } from "../datastore";
// import * as utils from "../utils";
import { Component } from "./base";

export class HTMLView extends Component {
    dataStore;
    pdiv;
    sim;

    constructor(parent, sim, args) {
        super(parent, args);

        this.sim = sim;

        this.pdiv = document.createElement("div");
        this.pdiv.style.width = "100%";
        this.pdiv.style.height = "100%";
        // utils.setTransform(this.pdiv, 0, 0);
        this.pdiv.style.position = "fixed";
        this.pdiv.classList.add("htmlview");
        this.div.appendChild(this.pdiv);

        // For storing the accumulated data.
        this.dataStore = new DataStore(1, this.sim, 0);

        // Call scheduleUpdate whenever the time is adjusted in the SimControl
        this.sim.timeSlider.div.addEventListener("adjustTime", e => {
            this.scheduleUpdate();
        });

        this.onresize(
            this.viewPort.scaleWidth(this.w),
            this.viewPort.scaleHeight(this.h)
        );
    }

    /**
     * Receive new line data from the server
     */
    onMessage(event) {
        const data = event.data.split(" ", 1);
        const time = parseFloat(data[0]);

        const msg = event.data.substring(data[0].length + 1);

        this.dataStore.push([time, msg]);
        // this.scheduleUpdate(null);
    }

    /**
     * Redraw the lines and axis due to changed data
     */
    update() {
        // Let the data store clear out old values
        this.dataStore.update();

        let data = this.dataStore.getLastData()[0];

        if (data === undefined) {
            data = "";
        }

        this.pdiv.innerHTML = data;

    }

    /**
     * Adjust the graph layout due to changed size
     */
    onresize(width, height) {
        if (width < this.minWidth) {
            width = this.minWidth;
        }
        if (height < this.minHeight) {
            height = this.minHeight;
        }

        this.width = width;
        this.height = height;
        this.label.style.width = width;

        this.update();
    }
}
