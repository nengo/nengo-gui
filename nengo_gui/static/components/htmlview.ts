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
import * as utils from "../utils";
import * as viewport from "../viewport";
import Component from "./component";

export default class HTMLView extends Component {
    data_store;
    pdiv;
    sim;

    constructor(parent, sim, args) {
        super(parent, args);
        const self = this;

        this.sim = sim;

        this.pdiv = document.createElement("div");
        this.pdiv.style.width = "100%";
        this.pdiv.style.height = "100%";
        utils.set_transform(this.pdiv, 0, 0);
        this.pdiv.style.position = "fixed";
        this.pdiv.classList.add("htmlview");
        this.div.appendChild(this.pdiv);

        // For storing the accumulated data.
        this.data_store = new DataStore(1, this.sim, 0);

        // Call schedule_update whenever the time is adjusted in the SimControl
        this.sim.div.addEventListener("adjust_time", function(e) {
            self.schedule_update(null);
        }, false);

        this.on_resize(
            viewport.scale_width(this.w), viewport.scale_height(this.h));
    };

    /**
     * Receive new line data from the server
     */
    on_message(event) {
        const data = event.data.split(" ", 1);
        const time = parseFloat(data[0]);

        const msg = event.data.substring(data[0].length + 1);

        this.data_store.push([time, msg]);
        this.schedule_update(null);
    };

    /**
     * Redraw the lines and axis due to changed data
     */
    update() {
        // Let the data store clear out old values
        this.data_store.update();

        let data = this.data_store.get_last_data()[0];

        if (data === undefined) {
            data = "";
        }

        this.pdiv.innerHTML = data;

    };

    /**
     * Adjust the graph layout due to changed size
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
        this.label.style.width = width;

        this.update();
    };
}
