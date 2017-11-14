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
import { VNode, dom, h } from "maquette";

import { Component, ResizableComponentView } from "./component";
import { DataStore } from "../datastore";
import { Menu } from "../menu";
import { InputDialogView } from "../modal";
import { Position } from "./position";
import { registerComponent } from "./registry";
import { Connection } from "../server";
import * as utils from "../utils";
import { Value } from "./value";
import { Widget } from "./widget";

export class SpaPointer extends Widget {
    protected _fixedValue: string = null;
    protected _showPairs: boolean;
    protected _view: SpaPointerView;

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

    get view(): SpaPointerView {
        if (this._view === null) {
            // TODO: how to get numItems?
            this._view = new SpaPointerView("?", 1);
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

export class SpaPointerView extends ResizableComponentView {

    root: SVGGElement;

    private _items: Array<SVGGElement> = [];
    private _values: Array<number>;

    constructor(label:string, numItems: number) {
        super(label);
        const node = h("g.widget");
        this.root = utils.domCreateSVG(node) as SVGGElement;
        this.numItems = numItems;
    }

    get labels(): Array<string> {
        return this._items.map(item => item.textContent);
    }

    set labels(val: Array<string>) {
        console.assert(val.length === this.numItems);
        this._items.forEach((item, i) => {
            item.textContent = val[i];
        });
    }

    get numItems(): number {
        return this._items.length;
    }

    set numItems(val: number) {
        while (this._items.length - val < 0) {
            this.addItem();
        }
        while (this._items.length - val > 0) {
            this.removeItem();
        }
    }

    get scale(): [number, number] {
        return this.overlayScale;
    }

    set scale(val: [number, number]) {
        const width = Math.max(ResizableComponentView.minWidth, val[0]);
        const height = Math.max(ResizableComponentView.minHeight, val[1]);
        this.overlayScale = [width, height];
    }

    get values(): Array<number> {
        return this._values;
    }

    set values(val: Array<number>) {
        console.assert(val.length === this.numItems);
        const height = this.scale[1];
        const total = val.reduce((a, b) => a + b, 0);

        let y = 0;
        this._items.forEach((item, i) => {
            item.setAttribute("y", `${y}`);

            const hex = utils.clip(val[i] * 255, 0, 255);
            item.setAttribute("stroke", `rgb(${hex},${hex},${hex})`);

            const itemHeight = (val[i] / total) * height;
            item.setAttribute("font-size", `${itemHeight}`);
            y += itemHeight;
        });

        // Keep these around so we resize
        this._values = val;
    }

    private addItem() {
        const width = this.scale[0];
        const i = this._items.length;
        const node = h("text.pointer", {
            "font-size": "12",
            "stroke": "rgb(255, 255, 255)",
            "x": `${width * 0.5}`,
            "y": `${i * 12}`,
        });
        const item = utils.domCreateSVG(node) as SVGGElement;
        this.root.appendChild(item);
        this._items.push(item);
    }

    private removeItem() {
        const item = this._items.pop();
        if (item != null) {
            this.root.removeChild(item);
        }
    }
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
