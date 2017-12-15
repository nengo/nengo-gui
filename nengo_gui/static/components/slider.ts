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
import * as interact from "interactjs";
import { dom, h, VNode } from "maquette";

import "./slider.css";

import { ComponentView } from "./component";
import { Menu } from "../menu";
import * as utils from "../utils";
import { InputDialogView } from "../modal";
import { ValueView } from "./value";
import { Position } from "./position";
import { registerComponent } from "./registry";
import { Connection } from "../server";
import { Widget } from "./widget";

export class Slider extends Widget {
    // The value to use when releasing from user control
    lastReceived: number[];
    sliderHeight: number;
    // The value to use when restarting the simulation from beginning
    startValue: number[];
    userValue: number[] = [];
    view: SliderView;

    constructor({
        server,
        uid,
        label,
        pos,
        dimensions,
        synapse,
        labelVisible = true,
        startValue = [],
        lim = [-1, 1]
    }: {
        server: Connection;
        uid: string;
        label: string;
        pos: Position;
        dimensions: number;
        synapse: number;
        labelVisible?: boolean;
        startValue?: number[];
        lim?: [number, number];
    }) {
        super(
            server,
            uid,
            new SliderView(dimensions),
            label,
            pos,
            dimensions,
            synapse,
            labelVisible
        );
        this.view.lim = lim;
        while (startValue.length < dimensions) {
            startValue.push(0);
        }

        this.startValue = startValue;
        this.lastReceived = startValue.slice();
        for (let i = 0; i < startValue.length; i++) {
            this.userValue.push(NaN);
            // Set before installing the change handler
            this.view.controls[i].value = startValue[i];
        }

        window.addEventListener("SimControl.reset", e => {
            this.reset();
        });

        this.fastServer.bind((data: ArrayBuffer) => {
            this.add(new Float64Array(data));
        });

        // Set up events for each slider control
        this.view.controls.forEach((control, i) => {
            const interactHandle = interact(control.handle);
            interactHandle.draggable({});
            interactHandle.on("tap", event => {
                control.enableManualEntry();
            });
            interactHandle.on("dragmove", event => {
                let [_, py] = utils.getTranslate(control.handle);
                py += event.dy;
                control.value = control.toValue(py);
                control.root.dispatchEvent(new Event("slidercontrol.changed"));
            });

            control.root.addEventListener("slidercontrol.changed", event => {
                this.userValue[i] = control.value;
                this.fastServer.send(Float64Array.from(this.userValue));
            });
        });
    }

    addMenuItems() {
        this.menu.addAction("Set range...", () => {
            this.askLim();
        });
        this.menu.addAction("Set value...", () => {
            this.askValue();
        });
        this.menu.addAction("Reset value", () => {
            this.forgetUserChanges();
        });
        this.menu.addSeparator();
        super.addMenuItems();
    }

    askLim() {
        const lim = this.view.lim;
        const modal = new InputDialogView(
            `[${lim[0]}, ${lim[1]}]`,
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
                const newLim = modal.input.value.split(",");
                console.assert(newLim.length === 2);
                this.view.lim = [parseFloat(newLim[0]), parseFloat(newLim[1])];
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

    askValue() {
        const plural = this.dimensions > 1 ? "s" : "";
        const prompt = this.view.controls
            .map(control => control.value.toFixed(2))
            .join(", ");
        const modal = new InputDialogView(
            prompt,
            `New value${plural}`,
            "Input should be one value for each slider, separated by commas."
        );
        modal.title = `Set slider value${plural}...`;
        modal.ok.addEventListener("click", () => {
            const validator = $(modal).data("bs.validator");
            validator.validate();
            if (validator.hasErrors() || validator.isIncomplete()) {
                return;
            }
            if (modal.input.value !== null) {
                const newValue = modal.input.value.split(",").map(parseFloat);
                // Update the sliders one at a time
                this.view.controls.forEach((control, i) => {
                    this.userValue[i] = newValue[i];
                    control.value = newValue[i];
                    control.root.dispatchEvent(new Event("slidercontrol.changed"));
                });
            }
            $(modal).modal("hide");
        });
        utils.handleTabs(modal);

        $(modal).validator({
            custom: {
                ngvalidator: item => {
                    const nums = item.value.split(",");
                    return (
                        nums.length === this.view.controls.length &&
                        nums.every(num => {
                            return utils.isNum(num);
                        })
                    );
                }
            }
        });
        $(modal.root).on("hidden.bs.modal", () => {
            document.body.removeChild(modal.root);
        });
        document.body.appendChild(modal.root);
        modal.show();
    }

    forgetUserChanges() {
        this.view.controls.forEach((control, i) => {
            control.value = this.lastReceived[i];
            this.userValue[i] = NaN;
        });
    }

    reset() {
        super.reset();
        this.view.controls.forEach((control, i) => {
            control.value = this.lastReceived[i];
        });
    }

    syncWithDataStore = utils.throttle(() => {
        const data = this.datastore.data[this.datastore.data.length - 1].slice(1);
        this.lastReceived = data;
        for (let i = 0; i < this.lastReceived.length; i++) {
            if (isNaN(this.userValue[i])) {
                this.view.controls[i].value = data[i];
            }
        }
    }, 20);
}

export class SliderView extends ComponentView {
    static padAround = 4;
    static padBetween = 6;

    controls: SliderControlView[] = [];
    group: HTMLDivElement;

    constructor(nControls: number) {
        super();

        const node = h("g.slider");
        this.body = utils.domCreateSVG(node) as SVGGElement;
        this.root.appendChild(this.body);

        for (let i = 0; i < nControls; i++) {
            this.addSliderControl();
        }
    }

    get lim(): [number, number] {
        return this.controls[0].lim;
    }

    set lim(val: [number, number]) {
        this.controls.forEach(control => {
            control.lim = val;
        });
    }

    get scale(): [number, number] {
        return this.overlayScale;
    }

    set scale(val: [number, number]) {
        const [width, height] = val;
        const totalPadding =
            (this.controls.length - 1) * SliderView.padBetween +
            SliderView.padAround * 2;
        const eachWidth = Math.max(
            (width - totalPadding) / this.controls.length,
            0
        );

        this.controls.forEach((control, i) => {
            control.scale = [eachWidth, height];
            control.pos = [
                SliderView.padAround + (eachWidth + SliderView.padBetween) * i,
                0
            ];
        });
        this.overlayScale = [width, height];
    }

    addSliderControl() {
        const control = new SliderControlView();
        this.controls.push(control);
        this.body.appendChild(control.root);
        // Resize
        this.scale = this.scale;
    }

    removeSliderControl(index: number = null) {
        if (index == null) {
            index = this.controls.length - 1;
        }
        this.body.removeChild(this.controls[index].root);
        this.controls.splice(index, 1);
        // Resize
        this.scale = this.scale;
    }

    ondomadd() {
        super.ondomadd();
        // Usually overlay goes on top, but for interaction controls go on top
        this.root.appendChild(this.body);
    }
}

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
export class SliderControlView {
    static guidelineWidth = 7;
    static handlePad = 2;

    guideline: SVGRectElement;
    handle: SVGGElement;
    handleRect: SVGGElement;
    handleText: SVGGElement;
    manualEntry: boolean = false;
    root: SVGGElement;

    private _lim: [number, number] = [0, 0];
    private _value: number = 0;

    constructor() {
        const node = h("g.control", { transform: "translate(0,0)" }, [
            h("rect.guideline", {
                height: "0",
                width: `${SliderControlView.guidelineWidth}`,
                x: "0"
            }),
            h("g.handle", { transform: "translate(0,0)" }, [
                h("rect", {
                    height: "0",
                    width: "0"
                }),
                h("text", { x: "0", y: "0" }, ["0.00"])
            ])
        ]);

        this.root = utils.domCreateSVG(node) as SVGGElement;
        this.guideline = this.root.querySelector(
            ".guideline"
        ) as SVGRectElement;
        this.handle = this.root.querySelector(".handle") as SVGGElement;
        this.handleRect = this.handle.querySelector("rect") as SVGRectElement;
        this.handleText = this.handle.querySelector("text") as SVGTextElement;
    }

    get lim(): [number, number] {
        return this._lim;
    }

    set lim(val: [number, number]) {
        this._lim = val;
        this.update();
    }

    get pos(): [number, number] {
        return utils.getTranslate(this.root);
    }

    set pos(val: [number, number]) {
        utils.setTranslate(this.root, val[0], val[1]);
    }

    get scale(): [number, number] {
        return [
            Number(this.handleRect.getAttribute("width")),
            Number(this.guideline.getAttribute("height"))
        ];
    }

    set scale(val: [number, number]) {
        this.guideline.setAttribute("height", `${val[1]}`);
        this.guideline.setAttribute(
            "x",
            `${(val[0] - SliderControlView.guidelineWidth) * 0.5}`
        );

        const textHeight = this.handleText.getBBox().height;
        this.handleRect.setAttribute("width", `${val[0]}`);
        this.handleText.setAttribute("x", `${val[0] * 0.5}`);
        this.handleText.setAttribute(
            "y",
            `${SliderControlView.handlePad + textHeight * 0.5}`
        );
        this.handleRect.setAttribute(
            "height",
            `${textHeight + SliderControlView.handlePad * 2}`
        );
        this.update();
    }

    get value(): number {
        return this._value;
    }

    set value(val: number) {
        val = utils.clip(val, this._lim[0], this._lim[1]);
        if (val !== this._value) {
            this._value = val;
            this.handleText.textContent = this._value.toFixed(2);
            this.update();
        }
    }

    enableManualEntry() {
        if (this.manualEntry) {
            console.warn("Manual entry is already enabled");
            return;
        }
        this.manualEntry = true;

        // Hide SVG text
        this.handleText.setAttribute("visibility", "hidden");

        // Render an HTML input inside the handle
        const foreign = utils.domCreateSVG(h("foreignObject"));
        const form = h(
            "body",
            {
                xmlns: "http://www.w3.org/1999/xhtml"
            },
            [
                h("input", {
                    styles: {
                        fontSize: window.getComputedStyle(this.handleText)
                            .fontSize,
                        width: `${this.handleRect.getAttribute("width")}px`
                    },
                    type: "text"
                })
            ]
        );
        foreign.appendChild(dom.create(form).domNode);
        this.handle.appendChild(foreign);

        const disable = () => {
            if (!this.manualEntry) {
                console.warn("Disable called twice");
                return;
            }
            this.manualEntry = false;
            this.handle.classList.remove("invalid");
            // Remove HTML input inside the handle
            this.handle.removeChild(this.handle.lastChild);
            // Show SVG text again
            this.handleText.setAttribute("visibility", null);
        };

        const input = this.handle.querySelector("input") as HTMLInputElement;
        input.value = this.value.toFixed(2);
        input.focus();
        input.select();
        input.addEventListener("input", () => {
            if (this.isValid(input.value)) {
                this.handle.classList.remove("invalid");
            } else {
                this.handle.classList.add("invalid");
            }
        });
        input.addEventListener("keydown", event => {
            const enterKey = 13;
            const escKey = 27;
            event.stopPropagation();
            if (event.which === enterKey) {
                event.preventDefault();
                if (this.isValid(input.value)) {
                    this.value = parseFloat(input.value);
                    this.root.dispatchEvent(new Event("slidercontrol.changed"));
                    disable();
                }
            } else if (event.which === escKey) {
                disable();
            }
        });
        input.addEventListener("blur", event => {
            // TODO: Should we set the value when blurring? I think yes...
            if (this.isValid(input.value)) {
                this.value = parseFloat(input.value);
                this.root.dispatchEvent(new Event("slidercontrol.changed"));
            }
            if (this.manualEntry) {
                disable();
            }
        });
    }

    isValid(val: number | string) {
        if (typeof val === "string") {
            val = parseFloat(val);
        }
        return val >= this._lim[0] && val <= this._lim[1];
    }

    toPixels(val: number) {
        const [vMin, vMax] = this._lim;
        const pRange =
            Number(this.guideline.getAttribute("height")) -
            Number(this.handleRect.getAttribute("height"));

        const vRange = vMax - vMin;
        return pRange - (val - vMin) / vRange * pRange;
    }

    toValue(pixels: number) {
        const [vMin, vMax] = this._lim;
        const pRange =
            Number(this.guideline.getAttribute("height")) -
            Number(this.handleRect.getAttribute("height"));

        return (pRange - pixels) / pRange * (vMax - vMin) + vMin;
    }

    private update = utils.throttle(() => {
        const pixels = this.toPixels(this._value);
        if (!isNaN(pixels)) {
            utils.setTranslate(this.handle, 0, this.toPixels(this._value));
        }
    }, 10);
}

registerComponent("slider", Slider);
