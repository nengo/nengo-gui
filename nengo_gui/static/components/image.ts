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
import * as viewport from "../viewport";
import { Component } from "./component";

export class Image extends Component {
    canvas;
    data_store;
    display_time;
    image;
    n_pixels;
    pixels_x;
    pixels_y;
    sim;
    svg;

    constructor(parent, sim, args) {
        super(parent, args);

        this.sim = sim;
        this.display_time = args.display_time;
        this.pixels_x = args.pixels_x;
        this.pixels_y = args.pixels_y;
        this.n_pixels = this.pixels_x * this.pixels_y;

        // For storing the accumulated data
        this.data_store = new DataStore(this.n_pixels, this.sim, 0);

        // Draw the plot as an SVG
        this.svg = d3.select(this.div).append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("style", [
                "padding-top:", "2em",
            ].join(""));

        // Call schedule_update whenever the time is adjusted in the SimControl
        this.sim.time_slider.div.addEventListener("adjust_time", e => {
            this.schedule_update();
        });

        // Create the image
        this.image = this.svg.append("image")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("style", [
                "image-rendering: -webkit-optimize-contrast;",
                "image-rendering: -moz-crisp-edges;",
                "image-rendering: pixelated;",
            ].join(""));

        this.canvas = document.createElement("CANVAS");
        this.canvas.width = this.pixels_x;
        this.canvas.height = this.pixels_y;

        this.on_resize(
            viewport.scale_width(this.w), viewport.scale_height(this.h));

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
        this.schedule_update();
    };

    /**
     * Redraw the lines and axis due to changed data
     */
    update() {
        // Let the data store clear out old values
        this.data_store.update();

        const data = this.data_store.get_last_data();
        const ctx = this.canvas.getContext("2d");
        const imgData = ctx.getImageData(0, 0, this.pixels_x, this.pixels_y);
        for (let i = 0; i < this.n_pixels; i++) {
            imgData.data[4 * i + 0] = data[i];
            imgData.data[4 * i + 1] = data[i];
            imgData.data[4 * i + 2] = data[i];
            imgData.data[4 * i + 3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);
        const dataURL = this.canvas.toDataURL("image/png");

        this.image.attr("xlink:href", dataURL);
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

        this.svg
            .attr("width", width)
            .attr("height", height);

        this.update();

        this.label.style.width = width;

        this.width = width;
        this.height = height;
        this.div.style.width = width;
        this.div.style.height = height;
    };
}
