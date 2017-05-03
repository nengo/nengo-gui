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

import { DataStore } from "../datastore";
import { Menu } from "../menu";
import * as utils from "../utils";
import * as viewport from "../viewport";
import { InputDialogView } from "../views/modal";
import { PointerView } from "./views/pointer";
import { Widget } from "./base";

export class Pointer extends Widget {

    protected _fixedValue: string = null;
    protected _showPairs: boolean;
    protected _view: PointerView;

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
        showPairs: boolean = false,
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
        this.menu.addAction("Hide pairs", () => {
            this.showPairs = false;
        }, () => this._showPairs);
        this.menu.addAction("Show pairs", () => {
            this.showPairs = true;
        }, () => !this._showPairs);
        this.menu.addSeparator();
        super.addMenuItems();
    }

    // TODO: handle bad pointer errors (?)

    askValue() {
        const modal = new InputDialogView(
            "Pointer", "New value", "Invalid semantic pointer expression. " +
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
            if ((value === null) || (value === "")) {
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
                },
            },
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
