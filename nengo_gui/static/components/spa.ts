/**
 * Decoded semantic pointer display.
 *
 * @constructor
 * @param {DOMElement} parent - the element to add this component to
 * @param {SimControl} sim - the simulation controller
 * @param {dict} args - A set of constructor arguments (see Component)
 *
 * Pointer constructor is called by python server when a user requests a plot
 * or when the config file is making graphs. Server request is handled in
 * netgraph.js {.on_message} function.
 */

import * as $ from "jquery";
import * as d3 from "d3";

import { DataStore } from "../datastore";
import * as utils from "../utils";
import { Component, Position, Widget } from "./base";
import { Menu } from "../menu";
import { registerComponent } from "./registry";
import { Connection } from "../server";
import "./spa-similarity.css";
import { InputDialogView } from "../views/modal";
import { PointerView } from "./views/pointer";
import { Value } from "./value";

export class SpaPointer extends Widget {
    protected _fixedValue: string = null;
    protected _showPairs: boolean;
    protected _view: PointerView;

    constructor({
        server,
        uid,
        pos,
        dimensions,
        synapse,
        showPairs = false
    }: {
        server: Connection;
        uid: string;
        pos: Position;
        dimensions: number;
        synapse: number;
        showPairs?: boolean;
    }) {
        super(
            server,
            uid,
            pos.left,
            pos.top,
            pos.width,
            pos.height,
            dimensions,
            synapse
        );
        this.showPairs = showPairs;
    }

    get fixedValue(): string | null {
        return this._fixedValue;
    }

    set fixedValue(val: string | null) {
        this._fixedValue = val;
        this.syncWithDataStore;
    }

    get showPairs(): boolean {
        return this._showPairs;
    }

    set showPairs(val: boolean) {
        if (this._showPairs !== val) {
            this._showPairs = val;
            // Notify server?
            // this.saveLayout();
        }
    }

    get view(): PointerView {
        if (this._view === null) {
            // TODO: how to get numItems?
            this._view = new PointerView("?", 1);
        }
        return this._view;
    }

    addMenuItems() {
        this.menu.addAction("Set pointer...", () => {
            this.askValue();
        });
        this.menu.addAction(
            "Hide pairs",
            () => {
                this.showPairs = false;
            },
            () => this._showPairs
        );
        this.menu.addAction(
            "Show pairs",
            () => {
                this.showPairs = true;
            },
            () => !this._showPairs
        );
        this.menu.addSeparator();
        super.addMenuItems();
    }

    // TODO: handle bad pointer errors (?)

    askValue() {
        const modal = new InputDialogView(
            "Pointer",
            "New value",
            "Invalid semantic pointer expression. " +
                "Semantic pointers must start with a capital letter. " +
                "Expressions can include mathematical operators such as +, " +
                "* (circular convolution), and ~ (pseudo-inverse). E.g., " +
                "(A + ~(B * C) * 2) * 0.5 would be a valid semantic pointer " +
                "expression."
        );
        modal.title = "Enter a Semantic Pointer ...";
        modal.ok.addEventListener("click", () => {
            const validator = $(modal).data("bs.validator");
            validator.validate();
            if (validator.hasErrors() || validator.isIncomplete()) {
                return;
            }

            let value = modal.input.value;
            if (value === null || value === "") {
                value = ":empty:";
            }
            this.fixedValue = value;
            // this.ws.send(value);
            $(modal).modal("hide");
        });
        utils.handleTabs(modal);

        $(modal).validator({
            custom: {
                ngvalidator: item => {
                    let ptr = item.value;
                    if (ptr === null) {
                        ptr = "";
                    }
                    // this.ws.send(":check only:" + ptr);
                }
            }
        });
        $(modal.root).on("hidden.bs.modal", () => {
            document.body.removeChild(modal.root);
        });
        document.body.appendChild(modal.root);
        modal.show();
    }

    /**
     * Redraw the lines and axis due to changed data.
     */
    syncWithDataStore = utils.throttle(() => {
        const data = this.datastore.at(this.currentTime);
        if (data != null) {
            this.view.values = data;
        }
    }, 20);
}

registerComponent("spa_pointer", SpaPointer);


/**
 * Line graph showing semantic pointer decoded values over time.
 *
 * @constructor
 * @param {DOMElement} parent - the element to add this component to
 * @param {SimControl} sim - the simulation controller
 * @param {dict} args - A set of constructor arguments (see Component)
 * @param {int} args.nLines - number of decoded values
 */

export class SpaSimilarity extends Value {
    constructor({
        server,
        uid,
        pos,
        dimensions,
        synapse,
        xlim = [-0.5, 0],
        ylim = [-1, 1]
    }: {
        server: Connection;
        uid: string;
        pos: Position;
        dimensions: number;
        synapse: number;
        xlim?: [number, number];
        ylim?: [number, number];
    }) {
        super({server, uid, pos, dimensions, synapse, xlim, ylim});
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
    }
}

registerComponent("spa_similarity", SpaSimilarity);
