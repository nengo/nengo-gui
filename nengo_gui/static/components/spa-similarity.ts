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

import { DataStore } from "../datastore";
import * as utils from "../utils";
import { Component } from "./base";
import "./spa-similarity.css";
import { Value } from "./value";

export class SpaSimilarity extends Value {

    constructor(
        left: number,
        top: number,
        width: number,
        height: number,
        parent: string,
        uid: string,
        dimensions: number,
        synapse: number,
        miniItem = null,
        xlim: [number, number] = [-0.5, 0],
        ylim: [number, number] = [-1, 1],
    ) {
        super(
            left,
            top,
            width,
            height,
            parent,
            uid,
            dimensions,
            synapse,
            miniItem,
            xlim,
            ylim,
        );
        this.view.legend.valuesVisible = true;
    }

    // Copy from Pointer
    // set showPairs(value) {
    //     if (this._showPairs !== value) {
    //         this._showPairs = value;
    //         this.saveLayout();
    //         this.ws.send(value);
    //     }
    // }

    resetLegendAndData(newLabels) {
        // Clear the database and create a new one since dimensions have changed
        this.datastore.reset();
        this.datastore.dims = newLabels.length;
        this.view.legend.numLabels = newLabels.length;
        this.legendLabels = newLabels;
    }

    /**
     * Handle websocket messages.
     *
     * There are three types of messages that can be received:
     *   - a legend needs to be updated
     *   - the data has been updated
     *   - showPairs has been toggled
     * This calls the method associated to handling the type of message.
     */
    // onMessage(event) {
    //     const data = JSON.parse(event.data);
    //     const funcName =  data.shift();
    //     this[funcName](data);
    // }

    addMenuItems() {
        // this.menu.addAction("Hide pairs", () => {
        //     this.showPairs = false;
        // }, () => this.showPairs);
        // this.menu.addAction("Show pairs", () => {
        //     this.showPairs = true;
        // }, () => !this.showPairs);
        this.menu.addSeparator();
        super.addMenuItems();
    };

}
