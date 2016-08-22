/**
 * Shows an image or pixel grid over time.
 *
 * @constructor
 * @param {DOMElement} parent - the element to add this component to
 * @param {SimControl} sim - the simulation controller
 * @param {dict} args - A set of constructor arguments (see Component)
 * @param {int} args.n_lines - number of decoded values
 * @param {float} args.miny - minimum value on y-axis
 * @param {float} args.maxy - maximum value on y-axis
 */

import * as d3 from "d3";

import { DataStore } from "../datastore";
import { Component } from "./component";

export default class Image extends Component {
    canvas;
    data_store;
    display_time;
    image;
    n_pixels;
    pixels_x;
    pixels_y;
    sim;
    svg;

    constructor(parent, viewport, sim, args) {
        super(parent, viewport, args);

        const self = this;
        self.sim = sim;
        self.display_time = args.display_time;
        self.pixels_x = args.pixels_x;
        self.pixels_y = args.pixels_y;
        self.n_pixels = self.pixels_x * self.pixels_y;

        // For storing the accumulated data
        self.data_store = new DataStore(self.n_pixels, self.sim, 0);

        // Draw the plot as an SVG
        self.svg = d3.select(self.div).append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("style", [
                "padding-top:", "2em",
            ].join(""));

        // Call schedule_update whenever the time is adjusted in the SimControl
        self.sim.div.addEventListener("adjust_time", function(e) {
            self.schedule_update(null);
        }, false);

        // Create the image
        self.image = self.svg.append("image")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("style", [
                "image-rendering: -webkit-optimize-contrast;",
                "image-rendering: -moz-crisp-edges;",
                "image-rendering: pixelated;",
            ].join(""));

        self.canvas = document.createElement("CANVAS");
        self.canvas.width = self.pixels_x;
        self.canvas.height = self.pixels_y;

        self.on_resize(this.get_screen_width(), this.get_screen_height());

    };

    /**
     * Receive new line data from the server
     */
    on_message(event) {
        let data = new Uint8Array(event.data);
        const msg_size = this.n_pixels + 4;

        for (let i = 0; i < data.length; i += msg_size) {
            const time_data = new Float32Array(event.data.slice(i, i + 4));
            data = Array.prototype.slice.call(data, i + 3, i + msg_size);
            data[0] = time_data[0];
            this.data_store.push(data);
        }
        this.schedule_update(event);
    };

    /**
     * Redraw the lines and axis due to changed data
     */
    update() {
        const self = this;

        // Let the data store clear out old values
        self.data_store.update();

        const data = self.data_store.get_last_data();
        const ctx = self.canvas.getContext("2d");
        const imgData = ctx.getImageData(0, 0, self.pixels_x, self.pixels_y);
        for (let i = 0; i < self.n_pixels; i++) {
            imgData.data[4 * i + 0] = data[i];
            imgData.data[4 * i + 1] = data[i];
            imgData.data[4 * i + 2] = data[i];
            imgData.data[4 * i + 3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);
        const dataURL = self.canvas.toDataURL("image/png");

        self.image.attr("xlink:href", dataURL);
    };

    /**
     * Adjust the graph layout due to changed size
     */
    on_resize(width, height) {
        const self = this;
        if (width < self.min_width) {
            width = self.min_width;
        }
        if (height < self.min_height) {
            height = self.min_height;
        }

        self.svg
            .attr("width", width)
            .attr("height", height);

        self.update();

        self.label.style.width = width;

        self.width = width;
        self.height = height;
        self.div.style.width = width;
        self.div.style.height = height;
    };
}
