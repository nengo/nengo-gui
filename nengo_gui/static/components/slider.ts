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

import * as d3 from "d3";
import * as $ from "jquery";
import * as interact from "interact.js";
import { dom, h } from "maquette";

import "./slider.css";

import { DataStore } from "../datastore";
import { Menu } from "../menu";
import * as utils from "../utils";
import { InputDialogView } from "../modal";
import { ValueView } from "./value";
import { Position } from "./position";
import { registerComponent } from "./registry";
import { Connection } from "../server";
import { Widget } from "./widget";

export class Slider extends Widget {
    axTop: number;
    borderSize: number;
    dataStore: DataStore;
    fillingSliderValue;
    group: HTMLDivElement;
    immediateNotify;
    nSliders: number;
    notifyMsgs;
    resetValue: number[];
    scale: [number, number];
    sliderHeight: number;
    sliders: SliderControl[];
    startValue: number[];

    protected _view: ValueView;

    constructor({
        server,
        uid,
        pos,
        dimensions,
        synapse,
        startValue = [0],
        lim = [-1, 1]
    }: {
        server: Connection;
        uid: string;
        pos: Position;
        dimensions: number;
        synapse: number;
        startValue?: number[];
        lim?: [number, number];
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

        // Check if user is filling in a number into a slider
        this.fillingSliderValue = false;
        this.nSliders = dimensions;

        this.dataStore = null;

        this.notifyMsgs = [];
        // TODO: get rid of the immediate parameter once the websocket delay
        //       fix is merged in (#160)
        this.immediateNotify = true;

        this.setAxesGeometry(this.width, this.height);

        // this.minHeight = 40;

        const gg = h("div", {
            position: "relative",
            style: {
                height: this.sliderHeight,
                marginTop: this.axTop,
                whiteSpace: "nowrap"
            }
        });
        this.group = dom.create(gg).domNode as HTMLDivElement;
        // this.div.appendChild(this.group);

        // Make the sliders
        // The value to use when releasing from user control
        this.resetValue = startValue;
        // The value to use when restarting the simulation from beginning
        this.startValue = startValue;

        this.sliders = [];
        for (let i = 0; i < dimensions; i++) {
            // Creating a SliderControl object for every slider handle required
            const slider = new SliderControl(lim[0], lim[1]);
            slider.container.style.width = 100 / dimensions + "%";
            // slider.displayValue(args.startValue[i]);
            slider.index = i;
            slider.fixed = false;

            slider
                .on("change", event => {
                    event.target.fixed = true;
                    this.sendValue(event.target.index, event.value);
                })
                .on("changestart", function(event) {
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
        window.addEventListener("TimeSlider.moveShown", e => {
            // this.scheduleUpdate();
        });

        window.addEventListener("SimControl.reset", e => {
            this.onResetSim();
        });
    }

    get view(): ValueView {
        if (this._view === null) {
            this._view = new ValueView("?");
        }
        return this._view;
    }

    setAxesGeometry(width, height) {
        this.scale = [width, height];
        const scale = parseFloat($("#main").css("font-size"));
        this.borderSize = 1;
        this.axTop = 1.75 * scale;
        this.sliderHeight = this.height - this.axTop;
    }

    sendValue(sliderIndex, value) {
        console.assert(typeof sliderIndex === "number");
        console.assert(typeof value === "number");

        if (this.immediateNotify) {
            // this.ws.send(sliderIndex + "," + value);
        } else {
            this.notify(sliderIndex + "," + value);
        }
        // this.sim.timeSlider.jumpToEnd();
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
        this.dataStore.add(Array.prototype.slice.call(data));

        // this.scheduleUpdate(event);
    }

    /**
     * Update visual display based when component is resized.
     */
    onresize(width, height) {
        console.assert(typeof width === "number");
        console.assert(typeof height === "number");

        // if (width < this.minWidth) {
        //     width = this.minWidth;
        // }
        // if (height < this.minHeight) {
        //     height = this.minHeight;
        // }

        this.setAxesGeometry(width, height);

        this.group.style.height = String(
            height - this.axTop - 2 * this.borderSize
        );
        this.group.style.marginTop = String(this.axTop);

        for (let i = 0; i < this.sliders.length; i++) {
            // this.sliders[i].onresize();
        }

        // this.label.style.width = String(this.width);
        // this.div.style.width = String(this.width);
        // this.div.style.height = String(this.height);
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
        // this.ws.send(msg);
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
            // this.dataStore.update();
            // const data = this.dataStore.getLastData();
            // for (let i = 0; i < this.sliders.length; i++) {
            //     if (!this.sim.timeSlider.isAtEnd || !this.sliders[i].fixed) {
            //         this.sliders[i].displayValue(data[i]);
            //     }
            // }
        }
    }

    userValue() {
        const prompt = this.sliders
            .map(slider => {
                return slider.value.toFixed(2);
            })
            .join(", ");

        const modal = new InputDialogView(
            prompt,
            "New value(s)",
            "Input should be one comma-separated " +
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
                }
            }
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
            String([range[1], range[0]]),
            "New range",
            "Input should be in the form '<min>,<max>'."
        );
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
                // this.saveLayout();
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
                    return nums.length === 2 && valid;
                }
            }
        });
        $(modal.root).on("hidden.bs.modal", () => {
            document.body.removeChild(modal.root);
        });
        document.body.appendChild(modal.root);
        modal.show();
    }

    layoutInfo() {
        // const info = Component.prototype.layoutInfo.call(this);
        // info.minValue = this.sliders[0].scale.domain()[1];
        // info.maxValue = this.sliders[0].scale.domain()[0];
        // return info;
    }

    updateLayout(config) {
        // FIXME: this has to be backwards to work. Something fishy must be going on
        for (let i = 0; i < this.sliders.length; i++) {
            this.sliders[i].setRange(config.minValue, config.maxValue);
        }
        // Component.prototype.updateLayout.call(this, config);
    }
}

registerComponent("slider", Slider);

/**
 * A SliderControl object which creates a single guideline + handle within
 * a slider object.
 *
 * @constructor
 * @param {int} min - The minimum value the handle can take
 * @param {int} max - the maximum value the handle can take
 *
 * SliderControl is called within the Slider constructor for each
 * handle that is needed.
 */
export class SliderControl {
    _dragY: number;
    borderWidth: number;
    container: HTMLDivElement;
    fixed; // this isn't used anywhere?
    guideline: HTMLDivElement;
    handle: HTMLDivElement;
    index; // this isn't used anywhere?
    listeners;
    max: number;
    min: number;
    scale;
    typeMode: boolean;
    value: number;

    constructor(min, max) {
        this.min = min;
        this.max = max;

        this.value = 0;
        this.typeMode = false;

        this.borderWidth = 1;

        this.scale = d3.scale.linear();
        this.scale.domain([max, min]);

        // TODO: move CSS to CSS file
        this.container = document.createElement("div");
        this.container.style.display = "inline-block";
        this.container.style.position = "relative";
        this.container.style.height = "100%";
        this.container.style.padding = "0.75em 0";

        this.guideline = document.createElement("div");
        this.guideline.classList.add("guideline");
        this.guideline.style.width = "0.5em";
        this.guideline.style.height = "100%";
        this.guideline.style.margin = "auto";
        $(this.guideline).on("mousedown", event => {
            this.setValue(this.value);
        });
        this.container.appendChild(this.guideline);

        this.handle = document.createElement("div");
        this.handle.classList.add("btn");
        this.handle.classList.add("btn-default");
        // utils.safeSetText(this.handle, "n/a");
        this.handle.style.position = "absolute";
        this.handle.style.height = "1.5em";
        this.handle.style.marginTop = "0.75em";
        this.handle.style.width = "95%";
        this.handle.style.fontSize = "inherit";
        this.handle.style.padding = "0.1em 0";
        this.handle.style.borderWidth = this.borderWidth + "px";
        this.handle.style.borderColor = "#666";
        this.handle.style.left = "2.5%";
        this.handle.style.transform = "translate(0, -50%)";
        this.updateHandlePos(0);
        this.container.appendChild(this.handle);

        interact(this.handle).draggable({
            onend: event => {
                this.dispatch("changeend", { target: this });
            },
            onmove: event => {
                this._dragY += event.dy;

                this.scale.range([0, this.guideline.clientHeight]);
                this.setValue(this.scale.invert(this._dragY));
            },
            onstart: () => {
                this.dispatch("changestart", { target: this });
                this.deactivateTypeMode(null);
                this._dragY = this.getHandlePos();
            }
        });

        interact(this.handle)
            .on("tap", event => {
                this.activateTypeMode();
                event.stopPropagation();
            })
            .on("keydown", event => {
                this.handleKeypress(event);
            });

        this.listeners = {};
    }

    on(ltype, fn) {
        this.listeners[ltype] = fn;
        return this;
    }

    dispatch(ltype, ev) {
        if (ltype in this.listeners) {
            this.listeners[ltype].call(this, ev);
        }
    }

    setRange(min, max) {
        this.min = min;
        this.max = max;
        this.scale.domain([max, min]);
        this.setValue(this.value);
        this.onResize();
    }

    displayValue(value) {
        if (value < this.min) {
            value = this.min;
        }
        if (value > this.max) {
            value = this.max;
        }

        this.value = value;

        this.updateHandlePos(value);
        this.updateValueText(value);
    }

    setValue(value) {
        this.displayValue(value);
        this.dispatch("change", { target: this, value: this.value });
    }

    activateTypeMode() {
        if (this.typeMode) {
            return;
        }

        this.dispatch("changestart", { target: this });

        this.typeMode = true;

        $(this.handle)
            .empty()
            .append(
                "<input id='valueInField' style='border:0; outline:0;'></input>"
            );

        const elem = this.handle.querySelector(
            "#valueInField"
        ) as HTMLInputElement;
        elem.value = this.formatValue(this.value);
        elem.focus();
        elem.select();
        elem.style.width = "100%";
        elem.style.textAlign = "center";
        elem.style.backgroundColor = "transparent";
        $(elem)
            .on("input", event => {
                if (utils.isNum(elem.value)) {
                    this.handle.style.backgroundColor = "";
                } else {
                    this.handle.style.backgroundColor = "salmon";
                }
            })
            .on("blur", event => {
                this.deactivateTypeMode(null);
            });
    }

    // Is this argument ever used?
    deactivateTypeMode(event) {
        if (!this.typeMode) {
            return;
        }

        this.dispatch("changeend", { target: this });

        this.typeMode = false;

        $(this.handle).off("keydown");
        this.handle.style.backgroundColor = "";
        // utils.safeSetText(this.handle, this.formatValue(this.value));
    }

    handleKeypress(event) {
        if (!this.typeMode) {
            return;
        }

        const enterKeycode = 13;
        const escKeycode = 27;
        const key = event.which;

        if (key === enterKeycode) {
            const input = (<HTMLInputElement>this.handle.querySelector(
                "#valueInField"
            )).value;
            if (utils.isNum(input)) {
                this.deactivateTypeMode(null);
                this.setValue(parseFloat(input));
            }
        } else if (key === escKeycode) {
            this.deactivateTypeMode(null);
        }
    }

    updateHandlePos(value) {
        this.handle.style.top = this.scale(value) + this.borderWidth;
    }

    getHandlePos() {
        return parseFloat(this.handle.style.top) - this.borderWidth;
    }

    updateValueText(value) {
        // utils.safeSetText(this.handle, this.formatValue(value));
    }

    formatValue(value) {
        return value.toFixed(2);
    }

    onResize() {
        this.scale.range([0, this.guideline.clientHeight]);
        this.updateHandlePos(this.value);
    }
}
