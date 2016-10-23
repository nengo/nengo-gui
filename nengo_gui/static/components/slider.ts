/**
 * A slider object with 1+ handles to adjust Node values
 *
 * @constructor
 * @param {DOMElement} parent - the element to add this component to
 * @param {SimControl} sim - the simulation controller
 * @param {dict} args - a set of constructor arguments (see Component)
 * @param {int} args.n_sliders - the number of sliders to show
 *
 * Slider constructor is called by python server when a user requests a slider
 * or when the config file is making sliders. Server request is handled in
 * netgraph.js {.on_message} function.
 */

import * as $ from "jquery";

import { DataStore } from "../datastore";
import * as menu from "../menu";
import * as viewport from "../viewport";
import { Component } from "./component";
import "./slider.css";
import { SliderControl } from "./slidercontrol";

export class Slider extends Component {
    axTop;
    borderSize;
    dataStore;
    fillingSliderValue;
    group;
    immediateNotify;
    nSliders;
    notifyMsgs;
    resetValue;
    sim;
    sliderHeight;
    sliders;
    startValue;

    constructor(parent, sim, args) {
        super(parent, args);
        this.sim = sim;

        // Check if user is filling in a number into a slider
        this.fillingSliderValue = false;
        this.nSliders = args.nSliders;

        this.dataStore = null;

        this.notifyMsgs = [];
        // TODO: get rid of the immediate parameter once the websocket delay
        //       fix is merged in (#160)
        this.immediateNotify = true;

        this.setAxesGeometry(this.width, this.height);

        this.minHeight = 40;

        this.group = document.createElement("div");
        this.group.style.height = this.sliderHeight;
        this.group.style.marginTop = this.axTop;
        this.group.style.whiteSpace = "nowrap";
        this.group.position = "relative";
        this.div.appendChild(this.group);

        // Make the sliders
        // The value to use when releasing from user control
        this.resetValue = args.startValue;
        // The value to use when restarting the simulation from beginning
        this.startValue = args.startValue;

        this.sliders = [];
        for (let i = 0; i < args.nSliders; i++) {
            // Creating a SliderControl object for every slider handle required
            const slider = new SliderControl(args.minValue, args.maxValue);
            slider.container.style.width = (100 / args.nSliders) + "%";
            // slider.displayValue(args.startValue[i]);
            slider.index = i;
            slider.fixed = false;

            slider.on("change", function(event) {
                event.target.fixed = true;
                this.sendValue(event.target.index, event.value);
            }).on("changestart", function(event) {
                menu.hideAny();
                for (let i = 0; i < this.sliders.length; i++) {
                    if (this.sliders[i] !== event.target) {
                        this.sliders[i].deactivateTypeMode();
                    }
                }
            });

            this.group.appendChild(slider.container);
            this.sliders.push(slider);
        }

        // Call scheduleUpdate whenever the time is adjusted in the SimControl
        this.sim.timeSlider.div.addEventListener("adjustTime", e => {
            this.scheduleUpdate();
        });

        this.sim.div.addEventListener("resetSim", e => {
            this.onResetSim();
        });

        this.onResize(
            viewport.scaleWidth(this.w), viewport.scaleHeight(this.h));
    }

    setAxesGeometry(width, height) {
        this.width = width;
        this.height = height;
        const scale = parseFloat($("#main").css("font-size"));
        this.borderSize = 1;
        this.axTop = 1.75 * scale;
        this.sliderHeight = this.height - this.axTop;
    }

    sendValue(sliderIndex, value) {
        console.assert(typeof sliderIndex === "number");
        console.assert(typeof value === "number");

        if (this.immediateNotify) {
            this.ws.send(sliderIndex + "," + value);
        } else {
            this.notify(sliderIndex + "," + value);
        }
        this.sim.timeSlider.jumpToEnd();
    }

    onResetSim() {
        // Release slider position and reset it
        for (let i = 0; i < this.sliders.length; i++) {
            this.notify("" + i + ",reset");
            this.sliders[i].displayValue(this.startValue[i]);
            this.sliders[i].fixed = false;
        }
    }

    /**
     * Receive new line data from the server.
     */
    onMessage(event) {
        const data = new Float32Array(event.data);
        if (this.dataStore === null) {
            this.dataStore = new DataStore(this.sliders.length, this.sim, 0);
        }
        this.resetValue = [];
        for (let i = 0; i < this.sliders.length; i++) {
            this.resetValue.push(data[i + 1]);

            if (this.sliders[i].fixed) {
                data[i + 1] = this.sliders[i].value;
            }
        }
        this.dataStore.push(data);

        // this.scheduleUpdate(event);
    }

    /**
     * Update visual display based when component is resized.
     */
    onResize(width, height) {
        console.assert(typeof width === "number");
        console.assert(typeof height === "number");

        if (width < this.minWidth) {
            width = this.minWidth;
        }
        if (height < this.minHeight) {
            height = this.minHeight;
        }

        this.setAxesGeometry(width, height);

        this.group.style.height = height - this.axTop - 2 * this.borderSize;
        this.group.style.marginTop = this.axTop;

        for (let i = 0; i < this.sliders.length; i++) {
            this.sliders[i].onResize();
        }

        this.label.style.width = this.width;
        this.div.style.width = this.width;
        this.div.style.height = this.height;
    }

    generateMenu() {
        const items = [
            ["Set range...", function() {
                this.setRange();
            }],
            ["Set value...", function() {
                this.userValue();
            }],
            ["Reset value", function() {
                this.userResetValue();
            }],
        ];

        // Add the parent's menu items to this
        // TODO: is this really the best way to call the parent's generateMenu()?
        return $.merge(items, Component.prototype.generateMenu.call(this));
    }

    /**
     * Report an event back to the server.
     */
    notify(info) {
        this.notifyMsgs.push(info);

        // Only send one message at a time
        // TODO: find a better way to figure out when it's safe to send
        // another message, rather than just waiting 1ms....
        if (this.notifyMsgs.length === 1) {
            window.setTimeout(function() {
                this.sendNotifyMsg();
            }, 50);
        }
    }

    /**
     * Send exactly one message back to server.
     *
     * Also schedule the next message to be sent, if any.
     */
    sendNotifyMsg() {
        const msg = this.notifyMsgs[0];
        this.ws.send(msg);
        if (this.notifyMsgs.length > 1) {
            window.setTimeout(function() {
                this.sendNotifyMsg();
            }, 50);
        }
        this.notifyMsgs.splice(0, 1);
    }

    update() {
        // Let the data store clear out old values
        if (this.dataStore !== null) {
            this.dataStore.update();

            const data = this.dataStore.getLastData();

            for (let i = 0; i < this.sliders.length; i++) {
                if (!this.dataStore.isAtEnd() || !this.sliders[i].fixed) {
                    this.sliders[i].displayValue(data[i]);
                }
            }
        }
    }

    userValue() {
        // First build the prompt string
        let promptString = "";
        for (let i = 0; i < this.sliders.length; i++) {
            promptString = promptString + this.sliders[i].value.toFixed(2);
            if (i !== this.sliders.length - 1) {
                promptString = promptString + ", ";
            }
        }
        this.sim.modal.title("Set slider value(s)...");
        this.sim.modal.singleInputBody(promptString, "New value(s)");
        this.sim.modal.footer("okCancel", function(e) {
            let newValue = $("#singleInput").val();
            const modal = $("#myModalForm").data("bs.validator");

            modal.validate();
            if (modal.hasErrors() || modal.isIncomplete()) {
                return;
            }
            this.immediateNotify = false;
            if (newValue !== null) {
                newValue = newValue.split(",");
                // Update the sliders one at a time
                for (let i = 0; i < this.sliders.length; i++) {
                    this.sliders[i].fixed = true;
                    this.sliders[i].setValue(parseFloat(newValue[i]));
                }
            }
            this.immediateNotify = true;
            $("#OK").attr("data-dismiss", "modal");
        });

        $("#myModalForm").validator({
            custom: {
                myValidator: function($item) {
                    const nums = $item.val().split(",");
                    if (nums.length !== this.sliders.length) {
                        return false;
                    }
                    for (let i = 0; i < nums.length; i++) {
                        if (!$.isNumeric(nums[i])) {
                            return false;
                        }
                    }
                    return true;
                },
            },
        });

        $("#singleInput").attr("data-error", "Input should be one " +
                               "comma-separated numerical value for each slider.");
        this.sim.modal.show();
    }

    userResetValue() {
        for (let i = 0; i < this.sliders.length; i++) {
            this.notify("" + i + ",reset");

            this.sliders[i].setValue(this.resetValue[i]);
            this.sliders[i].fixed = false;
        }
    }

    setRange() {
        const range = this.sliders[0].scale.domain();
        this.sim.modal.title("Set slider range...");
        this.sim.modal.singleInputBody([range[1], range[0]], "New range");
        this.sim.modal.footer("okCancel", function(e) {
            let newRange = $("#singleInput").val();
            const modal = $("#myModalForm").data("bs.validator");

            modal.validate();
            if (modal.hasErrors() || modal.isIncomplete()) {
                return;
            }
            if (newRange !== null) {
                newRange = newRange.split(",");
                const min = parseFloat(newRange[0]);
                const max = parseFloat(newRange[1]);
                for (let i = 0; i < this.sliders.length; i++) {
                    this.sliders[i].setRange(min, max);
                }
                this.saveLayout();
            }
            $("#OK").attr("data-dismiss", "modal");
        });
        $("#myModalForm").validator({
            custom: {
                myValidator: function($item) {
                    const nums = $item.val().split(",");
                    let valid = false;
                    if ($.isNumeric(nums[0]) && $.isNumeric(nums[1])) {
                        if (Number(nums[0]) < Number(nums[1])) {
                            // Two numbers, 1st less than 2nd
                            valid = true;
                        }
                    }
                    return (nums.length === 2 && valid);
                },
            },
        });

        $("#singleInput").attr("data-error", "Input should be in the " +
                               "form '<min>,<max>'.");
        this.sim.modal.show();
    }

    layoutInfo() {
        const info = Component.prototype.layoutInfo.call(this);
        info.minValue = this.sliders[0].scale.domain()[1];
        info.maxValue = this.sliders[0].scale.domain()[0];
        return info;
    }

    updateLayout(config) {
        // FIXME: this has to be backwards to work. Something fishy must be going on
        for (let i = 0; i < this.sliders.length; i++) {
            this.sliders[i].setRange(config.minValue, config.maxValue);
        }
        Component.prototype.updateLayout.call(this, config);
    }
}
