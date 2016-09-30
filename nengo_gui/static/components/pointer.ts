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
// import * as utils from "../utils";
import * as viewport from "../viewport";
import { Component } from "./component";
import "./pointer.css";

export class Pointer extends Component {
    dataStore;
    fixedValue;
    mouseDownTime;
    pdiv;
    pointerStatus;
    showPairs;
    sim;

    constructor(parent, sim, args) {
        super(parent, args);

        this.sim = sim;
        this.pointerStatus = false;

        this.pdiv = document.createElement("div");
        this.pdiv.style.width = args.width;
        this.pdiv.style.height = args.height;
        // utils.setTransform(this.pdiv, 0, 25);
        this.pdiv.style.position = "fixed";
        this.pdiv.classList.add("pointer");
        this.div.appendChild(this.pdiv);

        this.showPairs = args.showPairs;

        // For storing the accumulated data
        this.dataStore = new DataStore(1, this.sim, 0);

        // Call scheduleUpdate whenever the time is adjusted in the SimControl
        this.sim.timeSlider.div.addEventListener("adjustTime", e => {
            this.scheduleUpdate();
        });

        // Call reset whenever the simulation is reset
        this.sim.div.addEventListener("resetSim", e => {
            this.reset();
        });

        this.onResize(
            viewport.scaleWidth(this.w), viewport.scaleHeight(this.h));

        this.fixedValue = "";

        this.div.addEventListener("mouseup", function(event) {
            // For some reason "tap" doesn't seem to work here while the
            // simulation is running, so I'm doing the timing myself
            const now = new Date().getTime() / 1000;
            if (now - this.mouseDownTime > 0.1) {
                return;
            }
            if (event.button === 0) {
                if (this.menu.visible) {
                    this.menu.hide();
                } else {
                    this.menu.show(event.clientX, event.clientY,
                                   this.generateMenu());
                }
            }
        });

        this.div.addEventListener("mousedown", function(event) {
            this.mouseDownTime = new Date().getTime() / 1000;
        });
    }

    generateMenu() {
        const items = [];
        items.push(["Set value...", function() {
            this.setValue();
        }]);
        if (this.showPairs) {
            items.push(["Hide pairs", function() {
                this.setShowPairs(false);
            }]);
        } else {
            items.push(["Show pairs", function() {
                this.setShowPairs(true);
            }]);
        }

        // Add the parent's menu items to this
        // TODO: is this really the best way to call the parent's generateMenu()?
        return $.merge(items, Component.prototype.generateMenu.call(this));
    }

    setShowPairs(value) {
        if (this.showPairs !== value) {
            this.showPairs = value;
            this.saveLayout();
        }
    }

    setValue() {
        this.sim.modal.title("Enter a Semantic Pointer value...");
        this.sim.modal.singleInputBody("Pointer", "New value");
        this.sim.modal.footer("okCancel", function(e) {
            let value = $("#singleInput").val();
            const modal = $("#myModalForm").data("bs.validator");

            modal.validate();
            if (modal.hasErrors() || modal.isIncomplete()) {
                return;
            }
            if ((value === null) || (value === "")) {
                value = ":empty:";
            }
            this.fixedValue = value;
            this.ws.send(value);
            $("#OK").attr("data-dismiss", "modal");
        });
        $("#myModalForm").validator({
            custom: {
                myValidator: function($item) {
                    let ptr = $item.val();
                    if (ptr === null) {
                        ptr = "";
                    }
                    this.ws.send(":check only:" + ptr);
                    return this.pointerStatus;
                },
            },
        });

        $("#singleInput").attr(
            "data-error",
            "Invalid semantic pointer expression. Semantic pointers " +
                "themselves must start with a capital letter. Expressions " +
                "can include mathematical operators such as +, * (circular " +
                "convolution), and ~ (pseudo-inverse). E.g., " +
                "(A+~(B*C)*2)*0.5 would be a valid semantic pointer " +
                "expression.");

        this.sim.modal.show();
    }

    /**
     * Receive new line data from the server.
     */
    onMessage(event) {
        const data = event.data.split(" ");

        if (data[0].substring(0, 11) === "badPointer") {
            this.pointerStatus = false;
            return;
        } else if (data[0].substring(0, 12) === "goodPointer") {
            this.pointerStatus = true;
            return;
        }

        const time = parseFloat(data[0]);

        const items = data[1].split(";");
        this.dataStore.push([time, items]);
        this.scheduleUpdate();
    }

    /**
     * Redraw the lines and axis due to changed data.
     */
    update() {
        // Let the data store clear out old values
        this.dataStore.update();

        const data = this.dataStore.getLastData()[0];

        while (this.pdiv.firstChild) {
            this.pdiv.removeChild(this.pdiv.firstChild);
        }
        this.pdiv.style.width = this.width;
        this.pdiv.style.height = this.height;

        if (data === undefined) {
            return;
        }

        let totalSize = 0;
        const items = [];

        // Display the text in proportion to similarity
        for (let i = 0; i < data.length; i++) {
            const size = parseFloat(data[i].substring(0, 4));
            const span = document.createElement("span");
            // span.innerHTML = data[i].substring(4);
            this.pdiv.appendChild(span);
            totalSize += size;
            let c = Math.floor(255 - 255 * size);
            // TODO: Use clip
            if (c < 0) {
                c = 0;
            }
            if (c > 255) {
                c = 255;
            }
            span.style.color = "rgb(" + c + "," + c + "," + c + ")";
            items.push(span);
        }

        const scale = this.height / totalSize * 0.6;

        for (let i = 0; i < data.length; i++) {
            const size = parseFloat(data[i].substring(0, 4));
            items[i].style.fontSize = "" + (size * scale) + "px";
        }
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

        this.width = width;
        this.height = height;
        this.div.style.width = width;
        this.div.style.height = height;

        this.label.style.width = width;

        this.update();
    }

    layoutInfo() {
        const info = Component.prototype.layoutInfo.call(this);
        info.showPairs = this.showPairs;
        return info;
    }

    updateLayout(config) {
        this.showPairs = config.showPairs;
        Component.prototype.updateLayout.call(this, config);
    }

    reset() {
        this.dataStore.reset();
        this.scheduleUpdate();
    }
}
