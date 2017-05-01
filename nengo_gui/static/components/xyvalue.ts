import * as d3 from "d3";
import * as $ from "jquery";

import { DataStore } from "../datastore";
import * as utils from "../utils";
import { InputDialogView } from "../views/modal";
import { XYValueView } from "./views/xyvalue";
import { Axes, Plot } from "./base";

export class XYValue extends Plot {

    line: d3.svg.Line<Array<number>>;
    protected _index: [number, number] = [0, 1];
    protected _view: XYValueView;

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
        index: [number, number] = [0, 1],
        xlim: [number, number] = [-1, 1],
        ylim: [number, number] = [-1, 1],
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
            xlim,
            ylim
        );
        this.index = index;
        this.line = d3.svg.line();
        this.line.x((d) => this.axes.x.pixelAt(d[this._index[0] + 1]));
        this.line.y((d) => this.axes.y.pixelAt(d[this._index[1] + 1]));
    }

    get index(): [number, number] {
        return this._index;
    }

    set index(val: [number, number]) {
        if (val[0] >= this.dimensions || val[1] >= this.dimensions) {
            console.error(`Index not in ${this.dimensions} dimensions`);
        } else {
            this._index = val;
        }
    }

    get view(): XYValueView {
        if (this._view === null) {
            this._view = new XYValueView("?");
        }
        return this._view;
    }

    addMenuItems() {
        this.menu.addAction("Set X, Y limits...", () => {
            this.setRange();
        });
        this.menu.addAction("Set X, Y indices...", () => {
            this.setIndices();
        });
        this.menu.addSeparator();
        super.addMenuItems();
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

    /**
     * Adjust the graph layout due to changed size
     */
    onresize(width, height) {
        this.axes2d.onresize(width, height);

        this.update();

        this.label.style.width = width;
        // this.width = width;
        // this.height = height;
        this.div.style.width = width;
        this.div.style.height = height;
        this.recentCircle.attr("r", this.getCircleRadius());
    }

    layoutInfo() {
        const info = Component.prototype.layoutInfo.call(this);
        info.minValue = this.axes2d.scaleY.domain()[0];
        info.maxValue = this.axes2d.scaleY.domain()[1];
        info.indexX = this.indexX;
        info.indexY = this.indexY;
        return info;
    }

    updateLayout(config) {
        this.updateIndices(config.indexX, config.indexY);
        this.updateRange(config.minValue, config.maxValue);
        Component.prototype.updateLayout.call(this, config);
    }

    setRange() {
        const range = this.axes2d.scaleY.domain();
        const modal = new InputDialogView(
            range, "New range", "Input should be in the form " +
                "'<min>,<max>' and the axes must cross at zero."
        );
        modal.title = "Set graph range...";
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
                this.updateRange(min, max);
                this.update();
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
                        // Two numbers, 1st less than 2nd.
                        // The axes must intersect at 0.
                        const ordered = Number(nums[0]) < Number(nums[1]);
                        const zeroed = Number(nums[0]) * Number(nums[1]) <= 0;
                        if (ordered && zeroed) {
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

    updateRange(min, max) {
        this.axes2d.minVal = min;
        this.axes2d.maxVal = max;
        this.axes2d.scaleX.domain([min, max]);
        this.axes2d.scaleY.domain([min, max]);
        this.axes2d.axisX.tickValues([min, max]);
        this.axes2d.axisY.tickValues([min, max]);
        this.axes2d.axisY_g.call(this.axes2d.axisY);
        this.axes2d.axisX_g.call(this.axes2d.axisX);
        this.onresize(
            this.viewPort.scaleWidth(this.w),
            this.viewPort.scaleHeight(this.h)
        );
    }

    setIndices() {
        const modal = new InputDialogView(
            String([this.indexX, this.indexY]), "New indices",
            "Input should be two positive integers in the form " +
                "'<dimension 1>,<dimension 2>'. Dimensions are zero indexed."
        );
        modal.title = "Set X and Y indices...";
        modal.ok.addEventListener("click", () => {
            const validator = $(modal).data("bs.validator");
            validator.validate();
            if (validator.hasErrors() || validator.isIncomplete()) {
                return;
            }
            if (modal.input.value !== null) {
                const newIndices = modal.input.value.split(",");
                this.updateIndices(parseInt(newIndices[0], 10),
                                   parseInt(newIndices[1], 10));
                this.saveLayout();
            }
            $(modal).modal("hide");
        });
        utils.handleTabs(modal);

        $(modal).validator({
            custom: {
                ngvalidator: item => {
                    const nums = item.value.split(",").map(Number);
                    return ((parseInt(nums[0], 10) === nums[0]) &&
                            (parseInt(nums[1], 10) === nums[1]) &&
                            (nums.length === 2) &&
                            (Number(nums[1]) < this.nLines &&
                             Number(nums[1]) >= 0) &&
                            (Number(nums[0]) < this.nLines &&
                             Number(nums[0]) >= 0));
                },
            },
        });
        $(modal.root).on("hidden.bs.modal", () => {
            document.body.removeChild(modal.root);
        });
        document.body.appendChild(modal.root);
        modal.show();
    }

    updateIndices(indexX, indexY) {
        this.indexX = indexX;
        this.indexY = indexY;
        this.update();
    }

    reset() {
        this.dataStore.reset();
        this.scheduleUpdate();
    }
}
