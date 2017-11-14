/**
 * Line graph showing decoded values over time
 *
 * Value constructor is called by python server when a user requests a plot
 * or when the config file is making graphs. Server request is handled in
 * netgraph.js {.on_message} function.
 *
 * @constructor
 * @param {DOMElement} parent - the element to add this component to
 * @param {SimControl} sim - the simulation controller
 * @param {dict} args - A set of constructor arguments (see Component)
 * @param {int} args.n_lines - number of decoded values
 * @param {float} args.min_value - minimum value on y-axis
 * @param {float} args.max_value - maximum value on y-axis
 */

import * as d3 from "d3";
import * as $ from "jquery";
import { VNode, dom, h } from "maquette";

import { Axes, Plot } from "./plot";
import { InputDialogView } from "../modal";
import { PlotView } from "./plot";
import { Position } from "./position";
import { registerComponent } from "./registry";
import { Connection } from "../server";
import * as utils from "../utils";

export class Value extends Plot {
    lines: Array<d3.svg.Line<Array<number>>>;
    protected _view: ValueView;

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

        // Create the lines on the plots
        this.lines = utils.emptyArray(this.dimensions).map((_, i) =>
            d3.svg
                .line()
                .x(d => this.axes.x.pixelAt(d[0]))
                .y(d => this.axes.y.pixelAt(d[i + 1]))
                .defined(d => d[i + 1] != null)
        );
    }

    get view(): ValueView {
        if (this._view === null) {
            this._view = new ValueView("?", this.dimensions);
        }
        return this._view;
    }

    addMenuItems() {
        this.menu.addAction("Set y-limits...", () => {
            this.askYlim();
        });
        super.addMenuItems();
    }

    askYlim() {
        const modal = new InputDialogView(
            String(this.ylim),
            "New y-limits",
            "Input should be in the form '<min>,<max>'."
        );
        modal.title = "Set y-limits...";
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
                        // Two numbers, 1st less than 2nd
                        if (Number(nums[0]) < Number(nums[1])) {
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

    syncWithDataStore = utils.throttle(() => {
        // Update the lines
        const [tStart, tEnd] = this.xlim;
        // TODO: it should be possible to only modify the start and
        //       end of the line instead of remaking it every time...
        const shownData = this.datastore.timeSlice(tStart, tEnd);
        if (shownData[0] != null) {
            this.view.lines = this.lines.map(line => line(shownData));
            if (this.legendVisible && this.view.legend.valuesVisible) {
                const last = shownData[shownData.length - 1];
                this.view.legend.values = last.slice(1);
            }
        }
    }, 20);
}

export class ValueView extends PlotView {

    paths: Array<SVGPathElement> = [];

    constructor(label: string, dimensions: number = 1) {
        super(label, dimensions);
        this.numLines = dimensions;
    }

    set lines(val: Array<string>) {
        this.paths.forEach((path, i) => {
            path.setAttribute("d", val[i]);
        });
    }

    get numLines(): number {
        return this.paths.length;
    }

    set numLines(val: number) {
        while (this.paths.length - val < 0) {
            this.addPath();
        }
        while (this.paths.length - val > 0) {
            this.removePath();
        }
    }

    private addPath() {
        const i = this.paths.length;
        const node = h("path.line", {stroke: this.colors[i]});
        const path = utils.domCreateSVG(node) as SVGPathElement;
        this.paths.push(path);
        this.body.appendChild(path);
    }

    private removePath() {
        const path = this.paths.pop();
        if (path != null) {
            this.body.removeChild(path);
        }
    }
}

registerComponent("value", Value);
