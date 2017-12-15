/**
 * Raster plot showing spike events over time.
 *
 * @constructor
 * @param {DOMElement} parent - the element to add this component to
 * @param {SimControl} sim - the simulation controller
 * @param {dict} args - A set of constructor arguments (see Component)
 * @param {int} args.n_neurons - number of neurons
 *
 * Raster constructor is called by python server when a user requests a plot
 * or when the config file is making graphs. Server request is handled in
 * netgraph.js {.on_message} function.
 */

import * as d3 from "d3";
import * as $ from "jquery";

import { VNode, dom, h } from "maquette";

import { DataStore } from "../datastore";
import { InputDialogView } from "../modal";
import { Axes, Plot, PlotView  } from "./plot";
import { Position } from "./position";
import { registerComponent } from "./registry";
import { Connection } from "../server";
import * as utils from "../utils";

export class Raster extends Plot {
    view: RasterView;

    protected _nNeurons: number;

    constructor({
        server,
        uid,
        label,
        pos,
        synapse,
        nNeurons,
        labelVisible = true,
        xlim = [-0.5, 0],
    }: {
        server: Connection;
        uid: string;
        label: string;
        pos: Position;
        synapse: number;
        nNeurons: number;
        labelVisible?: boolean;
        xlim?: [number, number];
    }) {
        super(
            server,
            uid,
            new RasterView,
            label,
            pos,
            nNeurons,
            synapse,
            labelVisible,
            xlim,
            [0, nNeurons]
        );
        this.nNeurons = nNeurons;
    }

    get nNeurons(): number {
        return this._nNeurons;
    }

    set nNeurons(val: number) {
        this._nNeurons = val;
        this.ylim = [0, this.nNeurons];
    }

    addMenuItems() {
        this.menu.addAction("Set number of neurons...", () => {
            this.askNNeurons();
        });
        this.menu.addSeparator();
        super.addMenuItems();
    }

    askNNeurons() {
        const modal = new InputDialogView(
            `${this.nNeurons}`,
            "Number of neurons",
            "Input should be a positive integer"
        );
        modal.title = "Set number of neurons...";
        modal.ok.addEventListener("click", () => {
            const validator = $(modal).data("bs.validator");
            validator.validate();
            if (validator.hasErrors() || validator.isIncomplete()) {
                return;
            }
            if (modal.input.value !== null) {
                const newCount = parseInt(modal.input.value, 10);
                this.nNeurons = newCount;
            }
            $(modal).modal("hide");
        });
        utils.handleTabs(modal);

        $(modal).validator({
            custom: {
                ngvalidator: item => {
                    return utils.isInt(item.value);
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
        const [tStart, tEnd] = this.xlim;
        const shownData = this.datastore.timeSlice(tStart, tEnd);

        const path = [];
        if (shownData[0] != null) {
            shownData.forEach(row => {
                const t = this.axes.x.pixelAt(row[0]);
                // TODO: figure out what this should be (what is data?)
                row.slice(1).forEach(y => {
                    const y1 = this.axes.y.pixelAt(y);
                    const y2 = this.axes.y.pixelAt(y + 1);
                    path.push(`M ${t} ${y1}V${y2}`);
                });
            });
        }
        this.view.line = path.join("");
    }, 20);
}

export class RasterView extends PlotView {
    // All the lines are implemented as a single path element
    path: SVGPathElement;

    constructor() {
        super();
        const node = h("path.line", {stroke: this.colors[0]});
        this.path = utils.domCreateSVG(node) as SVGPathElement;
        this.body.appendChild(this.path);
    }

    set line(val: string) {
        this.path.setAttribute("d", val);
    }
}

registerComponent("raster", Raster);
