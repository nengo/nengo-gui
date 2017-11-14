import * as d3 from "d3";
import * as $ from "jquery";

import { DataStore } from "../datastore";
import * as utils from "../utils";
import { InputDialogView } from "../views/modal";
import { XYValueView } from "./views/xyvalue";
import { Axes, Plot, Position } from "./base";
import { registerComponent } from "./registry";
import { Connection } from "../server";

export class XYAxes extends Axes {
    get padding(): [number, number] {
        return [5, 5];
    }

    set scale(val: [number, number]) {
        this._width = Math.max(Axes.minWidth, val[0]);
        this._height = Math.max(Axes.minHeight, val[1]);

        const [xWidth, xHeight] = this.view.x.scale;
        const [yWidth, yHeight] = this.view.y.scale;

        this.x.pixelLim = [0, this._width];
        this.y.pixelLim = [this._height, 0];
        this.view.x.pos = [0, utils.clip(this.y.pixelAt(0), 0, this._height)];
        this.view.y.pos = [
            utils.clip(this.x.pixelAt(0), yWidth, this._width),
            0
        ];
        this.view.crosshair.scale = [this._width, this._height];
    }
}

export class XYValue extends Plot {
    line: d3.svg.Line<Array<number>>;
    protected _index: [number, number] = [0, 1];
    protected _view: XYValueView;

    constructor({
        server,
        uid,
        pos,
        dimensions,
        synapse,
        index = [0, 1],
        xlim = [-1, 1],
        ylim = [-1, 1]
    }: {
        server: Connection;
        uid: string;
        pos: Position;
        dimensions: number;
        synapse: number;
        index?: [number, number];
        xlim?: [number, number];
        ylim?: [number, number];
    }) {
        super(
            server,
            uid,
            pos.left,
            pos.top,
            pos.width,
            pos.height,
            dimensions,
            synapse,
            xlim,
            ylim
        );
        this.index = index;
        this.line = d3.svg.line();
        this.line.x(d => this.axes.x.pixelAt(d[this._index[0] + 1]));
        this.line.y(d => this.axes.y.pixelAt(d[this._index[1] + 1]));
    }

    get index(): [number, number] {
        return this._index;
    }

    set index(val: [number, number]) {
        if (val[0] >= this.dimensions || val[1] >= this.dimensions) {
            console.error(`Index not in ${this.dimensions} dimensions`);
        } else {
            this._index = val;
            this.syncWithDataStore();
        }
    }

    get view(): XYValueView {
        if (this._view === null) {
            this._view = new XYValueView("?");
        }
        return this._view;
    }

    addAxes(width, height, xlim, ylim) {
        this.axes = new XYAxes(this.view, width, height, xlim, ylim);
    }

    addMenuItems() {
        this.menu.addAction("Set X, Y limits...", () => {
            this.askLim();
        });
        this.menu.addAction("Set X, Y indices...", () => {
            this.askIndices();
        });
        this.menu.addSeparator();
        super.addMenuItems();
    }

    askLim() {
        const lim = this.axes.y.lim;
        const modal = new InputDialogView(
            `${lim[0]},${lim[1]}`,
            "New limits",
            "Input should be in the " +
                "form '<min>,<max>' and the axes must cross at zero."
        );
        modal.title = "Set X, Y limits...";
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
                this.xlim = [min, max];
                this.ylim = [min, max];
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
                        // Two numbers, 1st less than 2nd.
                        // The axes must intersect at 0.
                        const ordered = Number(nums[0]) < Number(nums[1]);
                        const zeroed = Number(nums[0]) * Number(nums[1]) <= 0;
                        if (ordered && zeroed) {
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

    askIndices() {
        const modal = new InputDialogView(
            `${this.index[0]},${this.index[1]}`,
            "New indices",
            "Input should be two positive integers in the form " +
                "'<dimension 1>,<dimension 2>'. Dimensions are zero indexed."
        );
        modal.title = "Set X, Y indices...";
        modal.ok.addEventListener("click", () => {
            const validator = $(modal).data("bs.validator");
            validator.validate();
            if (validator.hasErrors() || validator.isIncomplete()) {
                return;
            }
            if (modal.input.value !== null) {
                const newIndices = modal.input.value.split(",");
                this.index = [
                    parseInt(newIndices[0], 10),
                    parseInt(newIndices[1], 10)
                ];
            }
            $(modal).modal("hide");
        });
        utils.handleTabs(modal);

        $(modal).validator({
            custom: {
                ngvalidator: item => {
                    const nums = item.value.split(",").map(Number);
                    return (
                        parseInt(nums[0], 10) === nums[0] &&
                        parseInt(nums[1], 10) === nums[1] &&
                        nums.length === 2 &&
                        (Number(nums[1]) < this.dimensions &&
                            Number(nums[1]) >= 0) &&
                        (Number(nums[0]) < this.dimensions &&
                            Number(nums[0]) >= 0)
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

    /**
     * Redraw the lines and axis due to changed data.
     */
    syncWithDataStore = utils.throttle(() => {
        // Update the lines
        const [tStart, tEnd] = this.xlim;
        const shownData = this.datastore.timeSlice(tStart, tEnd);
        if (shownData[0] != null) {
            this.view.line = this.line(shownData);
        }
    }, 20);
}

registerComponent("xy_value", XYValue);
