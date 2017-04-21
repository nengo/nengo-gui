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

import * as utils from "../utils";
import { InputDialogView } from "../views/modal";
import { ValueView } from "./views/value";
import { Plot } from "./base";
import { TimeAxes } from "./axes";
import "./value.css";

export class Value extends Plot {
    axes;
    displayTime;
    legend: HTMLDivElement;
    legendLabels: string[];
    line;
    nLines: number;
    path;
    _showLegend: boolean;
    synapse;

    protected _view: ValueView;

    constructor(
        left: number,
        top: number,
        width: number,
        height: number,
        parent: string,
        uid: string,
        dimensions: number,
        displayTime: number,
        synapse: number,
        miniItem = null,
        nLines = 1,
        minValue: number = -1,
        maxValue: number = 1,
    ) {
        super(left, top, width, height, parent, uid, dimensions, miniItem);

        this.nLines = nLines;
        this.displayTime = displayTime;
        this.synapse = synapse;

        this.axes = new TimeAxes(
            this.view.axes,
            width,
            height,
            0.0, // minValue,
            1.0, // maxValue,
            4.0, // timeVisible,
        );

        window.addEventListener(
            "TimeSlider.moveShown", utils.throttle((e: CustomEvent) => {
                // Determine visible range from the SimControl
                const [t1, t2] = e.detail.shownTime;
                this.axes.timeRange = [t1, t2];
                // Update the lines
                const shownData = this.datastore.dataAtTime(t1, t2);
                this.path.data(shownData).attr("d", this.line);
            }, 50) // Update once every 50 ms
        );
        window.addEventListener("SimControl.reset", (e) => {
            this.reset();
        });

        // Create the lines on the plots
        this.line = d3.svg.line();
        // TODO: hopefully the moveShown takes care of this?
        // this.line.x((d, i) => {
        //     return this.axes.scaleX(
        //         this.datastore.times[i + this.datastore.firstShownIndex],
        //     );
        // });
        this.line.y((d) => {
            return this.axes.scaleY(d);
        });
        this.path = d3.select(this.view.plot)
            .selectAll("path")
            .data(this.datastore.data);

        // TODO: onresize
        // this.onresize(
        //     this.viewPort.scaleWidth(this.w),
        //     this.viewPort.scaleHeight(this.h),
        // );

        this.axes.yTicks = [minValue, maxValue];

        // TODO: legend
        // this.legend = document.createElement("div");
        // this.legend.classList.add("legend");
        // this.div.appendChild(this.legend);

        // this.legendLabels = args.legendLabels || [];
        // if (this.legendLabels.length !== this.nLines) {
        //     // Fill up the array with temporary labels
        //     for (let i = this.legendLabels.length; i < this.nLines; i++) {
        //         this.legendLabels[i] = "label_" + i;
        //     }
        // }

        // this.showLegend = args.showLegend || false;
        // if (this.showLegend === true) {
        //     // utils.drawLegend(this.legend,
        //     //                   this.legendLabels.slice(0, this.nLines),
        //     //                   this.colorFunc,
        //     //                   this.uid);
        // }
    }

    // set showLegend(value) {
    //     if (this._showLegend !== value) {
    //         this._showLegend = value;
    //         this.saveLayout();

    //         if (this._showLegend === true) {
    //             // utils.drawLegend(this.legend,
    //             //                   this.legendLabels.slice(0, this.nLines),
    //             //                   this.colorFunc,
    //             //                   this.uid);
    //         } else {
    //             // Delete the legend's children
    //             while (this.legend.lastChild) {
    //                 this.legend.removeChild(this.legend.lastChild);
    //             }
    //         }
    //     }
    // }

    get view(): ValueView {
        if (this._view === null) {
            this._view = new ValueView("?");
        }
        return this._view;
    }

    /**
     * Receive new line data from the server.
     */
    // onMessage(event) {
    //     let data = new Float32Array(event.data);
    //     data = Array.prototype.slice.call(data);
    //     const size = this.nLines + 1;
    //     // Since multiple data packets can be sent with a single event,
    //     // make sure to process all the packets.
    //     while (data.length >= size) {
    //         this.datastore.push(data.slice(0, size));
    //         data = data.slice(size);
    //     }
    //     if (data.length > 0) {
    //         console.warn("extra data: " + data.length);
    //     }
    // }

    /**
     * Adjust the graph layout due to changed size.
     */
    // onresize(width, height) {
    //     if (width < this.minWidth) {
    //         width = this.minWidth;
    //     }
    //     if (height < this.minHeight) {
    //         height = this.minHeight;
    //     }

    //     this.axes.onresize(width, height);

    //     this.update();

    //     this.label.style.width = width;

    //     // this.width = width;
    //     // this.height = height;
    //     this.div.style.width = width;
    //     this.div.style.height = height;
    // }

    addMenuItems() {
        this.menu.addAction("Set range...", () => {
            this.setRange();
        });
        this.menu.addAction("Set synapse...", () => {
                this.setSynapseDialog();
        });
        // this.menu.addAction("Hide legend", () => {
        //     this.showLegend(false);
        // }, () => this.showLegend);
        // this.menu.addAction("Show legend", () => {
        //     this.showLegend(true);
        // }, () => !this.showLegend);
        // TODO: give the legend it's own context menu
        this.menu.addAction("Set legend labels", () => {
            // this.setLegendLabels();
        });
        this.menu.addSeparator();
        super.addMenuItems();
    }

    // setLegendLabels() {
    //     const modal = new InputDialogView("Legend label", "New value");
    //     modal.title = "Enter comma seperated legend label values";
    //     modal.ok.addEventListener("click", () => {
    //         const labelCsv = modal.input.value;

    //         // No validation to do.
    //         // Empty entries assumed to be indication to skip modification.
    //         // Long strings okay.
    //         // Excissive entries get ignored.
    //         // TODO: Allow escaping of commas
    //         if ((labelCsv !== null) && (labelCsv !== "")) {
    //             const labels = labelCsv.split(",");

    //             for (let i = 0; i < this.nLines; i++) {
    //                 if (labels[i] !== "" && labels[i] !== undefined) {
    //                     this.legendLabels[i] = labels[i];
    //                 }
    //             }

    //             // Redraw the legend with the updated label values
    //             while (this.legend.lastChild) {
    //                 this.legend.removeChild(this.legend.lastChild);
    //             }

    //             // utils.drawLegend(this.legend,
    //             //                   this.legendLabels,
    //             //                   this.colorFunc,
    //             //                   this.uid);
    //             this.saveLayout();
    //         }
    //         $(modal).modal("hide");
    //     });
    //     utils.handleTabs(modal);
    //     $(modal.root).on("hidden.bs.modal", () => {
    //         document.body.removeChild(modal.root);
    //     });
    //     document.body.appendChild(modal.root);
    //     modal.show();
    // }

    // layoutInfo() {
    //     const info = Component.prototype.layoutInfo.call(this);
    //     info.showLegend = this.showLegend;
    //     info.legendLabels = this.legendLabels;
    //     info.minValue = this.axes.scaleY.domain()[0];
    //     info.maxValue = this.axes.scaleY.domain()[1];
    //     return info;
    // }

    // updateLayout(config) {
    //     this.yLim(config.minValue, config.maxValue);
    //     Component.prototype.updateLayout.call(this, config);
    // }

    setRange() {
        const range = this.axes.scaleY.domain();
        const modal = new InputDialogView(
            range, "New range", "Input should be in the form '<min>,<max>'."
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
                this.yLim(min, max);
                // this.saveLayout();
                this.axes.axisY.tickValues([min, max]);
                this.axes.fitTicks(this);
            }
            // TODO: this was a separate handler before, but should only
            //       fire when validation passes right?
            // this.onresize(this.div.clientWidth, this.div.clientHeight);

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

    // TODO: move to axes
    yLim(min, max) {
        this.axes.scaleY.domain([min, max]);
        this.axes.axisY(this.axes.view.axisY);
    }

    reset() {
        this.datastore.reset();

    }

    setSynapseDialog() {
        const modal = new InputDialogView(
            this.synapse, "Filter time constant (in seconds)",
            "Input should be a non-negative number"
        );
        modal.title = "Set synaptic filter...";
        modal.ok.addEventListener("click", () => {
            const validator = $(modal).data("bs.validator");
            validator.validate();
            if (validator.hasErrors() || validator.isIncomplete()) {
                return;
            }
            if (modal.input.value !== null) {
                const newSynapse = parseFloat(modal.input.value);
                if (newSynapse !== this.synapse) {
                    this.synapse = newSynapse;
                    // this.ws.send("synapse:" + this.synapse);
                }
            }
            $(modal).modal("hide");
        });
        utils.handleTabs(modal);

        $(modal).validator({
            custom: {
                ngvalidator: item => {
                    return utils.isNum(item.value) && Number(item.value) >= 0;
                },
            },
        });
        $(modal.root).on("hidden.bs.modal", () => {
            document.body.removeChild(modal.root);
        });
        document.body.appendChild(modal.root);
        modal.show();
    }
}
