import * as d3 from "d3";
import * as $ from "jquery";
import { VNode, dom, h } from "maquette";

import { ResizableComponentView } from "./component";
import { DataStore } from "../datastore";
import { InputDialogView } from "../modal";
import { Axes, Plot, PlotView } from "./plot";
import { Position } from "./position";
import { registerComponent } from "./registry";
import { Connection } from "../server";
import * as utils from "../utils";

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

export class XYValueView extends PlotView {
    circle: SVGCircleElement;
    path: SVGPathElement;

    constructor(label: string) {
        super(label, 1); // Dimensions always 1
        const pathNode = h("path.line", {stroke: this.colors[0]});
        const circleNode = h("circle.last-point", {
            cx: "0", cy: "0", fill: this.colors[0], r: "0",
        });
        this.path = utils.domCreateSVG(pathNode) as SVGPathElement;
        this.body.appendChild(this.path);
        this.circle = utils.domCreateSVG(circleNode) as SVGCircleElement;
    }

    set line(val: string) {
        this.path.setAttribute("d", val);
        if (!this.body.contains(this.circle)) {
            this.body.appendChild(this.circle);
        }
        // Parse the "d" attribute to get the last x, y coordinate
        const commands = val.split(/(?=[LMC])/);
        const last = commands[commands.length - 1];
        const lastNums = last.replace(/[lmcz]/ig, "").split(",").map(Number);
        this.circle.setAttribute("cx", `${lastNums[0]}`);
        this.circle.setAttribute("cy", `${lastNums[1]}`);
    }

    get scale(): [number, number] {
        return this.overlayScale;
    }

    set scale(val: [number, number]) {
        const width = Math.max(ResizableComponentView.minWidth, val[0]);
        const height = Math.max(ResizableComponentView.minHeight, val[1]);
        this.overlayScale = [width, height];
        this.legend.pos = [width + 2, 0];
        this.circle.setAttribute("r", `${Math.min(width, height) / 30}`);
    }
}

registerComponent("xy_value", XYValue);
