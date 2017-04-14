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
import { dom, h  } from "maquette";

import { DataStore } from "../datastore";
import { Menu } from "../menu";
import * as utils from "../utils";
import * as viewport from "../viewport";
import { InputDialogView } from "../views/modal";
import { Component } from "./base";
import "./slider.css";
import { SliderControl } from "./slidercontrol";

export class Slider extends Component {
    axTop: number;
    borderSize: number;
    dataStore: DataStore;
    fillingSliderValue;
    group: HTMLDivElement;
    immediateNotify;
    nSliders: number;
    notifyMsgs;
    resetValue: number[];
    sim;
    sliderHeight: number;
    sliders: SliderControl[];
    startValue: number[];

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

        const gg = h("div", {position: "relative", style: {
            height: this.sliderHeight,
            marginTop: this.axTop,
            whiteSpace: "nowrap"},
        });
        this.group = dom.create(gg).domNode as HTMLDivElement;
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

            slider.on("change", event => {
                event.target.fixed = true;
                this.sendValue(event.target.index, event.value);
            }).on("changestart", function(event) {
                Menu.hideShown();
                for (let i = 0; i < this.sliders.length; i++) {
                    if (this.sliders[i] !== event.target) {
                        this.sliders[i].deactivateTypeMode(null);
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

        this.onresize(
            this.viewPort.scaleWidth(this.w),
            this.viewPort.scaleHeight(this.h)
        );
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
            this.dataStore = new DataStore(this.sliders.length, 0);
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
    onresize(width, height) {
        console.assert(typeof width === "number");
        console.assert(typeof height === "number");

        if (width < this.minWidth) {
            width = this.minWidth;
        }
        if (height < this.minHeight) {
            height = this.minHeight;
        }

        this.setAxesGeometry(width, height);

        this.group.style.height = String(height - this.axTop - 2 * this.borderSize);
        this.group.style.marginTop = String(this.axTop);

        for (let i = 0; i < this.sliders.length; i++) {
            this.sliders[i].onresize();
        }

        this.label.style.width = String(this.width);
        this.div.style.width = String(this.width);
        this.div.style.height = String(this.height);
    }

    addMenuItems() {
        this.menu.addAction("Set range...", () => {
            this.setRange();
        });
        this.menu.addAction("Set value...", () => {
            this.userValue();
        });
        this.menu.addAction("Reset value", () => {
            this.userResetValue();
        });
        this.menu.addSeparator();
        super.addMenuItems();
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
            window.setTimeout(() => {
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
            window.setTimeout(() => {
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
                if (!this.sim.timeSlider.isAtEnd || !this.sliders[i].fixed) {
                    this.sliders[i].displayValue(data[i]);
                }
            }
        }
    }

    userValue() {
        const prompt = this.sliders.map(slider => {
            return slider.value.toFixed(2);
        }).join(", ");

        const modal = new InputDialogView(
            prompt, "New value(s)", "Input should be one comma-separated " +
                "numerical value for each slider."
        );
        modal.title = "Set slider value(s)...";
        modal.ok.addEventListener("click", () => {
            const validator = $(modal).data("bs.validator");
            validator.validate();
            if (validator.hasErrors() || validator.isIncomplete()) {
                return;
            }
            this.immediateNotify = false;
            if (modal.input.value !== null) {
                const newValue = modal.input.value.split(",");
                // Update the sliders one at a time
                this.sliders.forEach((slider, i) => {
                    slider.fixed = true;
                    slider.setValue(parseFloat(newValue[i]));
                });
            }
            this.immediateNotify = true;
            $(modal).modal("hide");
        });
        utils.handleTabs(modal);

        $(modal).validator({
            custom: {
                ngvalidator: item => {
                    const nums = item.value.split(",");
                    if (nums.length !== this.sliders.length) {
                        return false;
                    }
                    return nums.every(num => {
                        return utils.isNum(num);
                    });
                },
            },
        });
        $(modal.root).on("hidden.bs.modal", () => {
            document.body.removeChild(modal.root);
        });
        document.body.appendChild(modal.root);
        modal.show();
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
        const modal = new InputDialogView(
            String([range[1], range[0]]), "New range",
            "Input should be in the form '<min>,<max>'.");
        modal.title = "Set slider range...";
        modal.ok.addEventListener("click", () => {
            const validator = $(modal).data("bs.validator");
            validator.validate();
            if (validator.hasErrors() || validator.isIncomplete()) {
                return;
            }
            if (modal.input.value !== null) {
                const newRange = modal.input.value.split(",");
                const min = parseFloat(newRange[0]);
                const max = parseFloat(newRange[1]);
                for (let i = 0; i < this.sliders.length; i++) {
                    this.sliders[i].setRange(min, max);
                }
                this.saveLayout();
            }
            $(modal).modal("hide");
        });
        utils.handleTabs(modal);

        $(modal).validator({
            custom: {
                ngvalidator: item => {
                    const nums = item.value.split(",");
                    let valid = false;
                    if (utils.isNum(nums[0]) && utils.isNum(nums[1])) {
                        if (Number(nums[0]) < Number(nums[1])) {
                            // Two numbers, 1st less than 2nd
                            valid = true;
                        }
                    }
                    return (nums.length === 2 && valid);
                },
            },
        });
        $(modal.root).on("hidden.bs.modal", () => {
            document.body.removeChild(modal.root);
        });
        document.body.appendChild(modal.root);
        modal.show();
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
