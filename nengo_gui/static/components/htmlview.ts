/**
 * Arbitrary HTML display taking input from a Node
 * See nengo_gui/examples/basics/html.py for example usage.
 *
 * @constructor
 * @param {DOMElement} parent - the element to add this component to
 * @param {SimControl} sim - the simulation controller
 * @param {dict} args - A set of constructor arguments (see Component)
 */

import { Component } from "./component";
import { DataStore } from "../datastore";
import * as utils from "../utils";

export default class HTMLView extends Component {

    constructor(parent, viewport, sim, args) {
        super(parent, viewport, args);
        var self = this;

        this.sim = sim;

        this.pdiv = document.createElement('div');
        this.pdiv.style.width = '100%';
        this.pdiv.style.height = '100%';
        utils.set_transform(this.pdiv, 0, 0);
        this.pdiv.style.position = 'fixed';
        this.pdiv.classList.add('htmlview');
        this.div.appendChild(this.pdiv);

        // For storing the accumulated data.
        this.data_store = new DataStore(1, this.sim, 0);

        // Call schedule_update whenever the time is adjusted in the SimControl
        this.sim.div.addEventListener('adjust_time',
                                      function(e) {self.schedule_update();}, false);

        this.on_resize(this.get_screen_width(), this.get_screen_height());
    };

    /**
     * Receive new line data from the server
     */
    on_message(event) {
        var data = event.data.split(" ", 1);
        var time = parseFloat(data[0]);

        var msg = event.data.substring(data[0].length + 1);

        this.data_store.push([time, msg]);
        this.schedule_update();
    };

    /**
     * Redraw the lines and axis due to changed data
     */
    update() {
        // Let the data store clear out old values
        this.data_store.update();

        var data = this.data_store.get_last_data()[0];

        if (data === undefined) {
            data = '';
        }

        this.pdiv.innerHTML = data;

    };

    /**
     * Adjust the graph layout due to changed size
     */
    on_resize(width, height) {
        if (width < this.minWidth) {
            width = this.minWidth;
        }
        if (height < this.minHeight) {
            height = this.minHeight;
        };

        this.width = width;
        this.height = height;
        this.label.style.width = width;

        this.update();
    };

}
