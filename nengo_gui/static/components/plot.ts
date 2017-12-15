import * as d3 from "d3";
import { VNode, dom, h } from "maquette";

import "./plot.css";

import { ComponentView } from "./component";
import { InputDialogView } from "../modal";
import { Position } from "./position";
import { Connection } from "../server";
import * as utils from "../utils";
import { Widget } from "./widget";

export class Axis {
    axis: d3.svg.Axis;
    g: d3.Selection<SVGGElement>;
    scale: d3.scale.Linear<number, number>;

    constructor(xy: "X" | "Y", g: SVGGElement, lim: [number, number]) {
        this.scale = d3.scale.linear();
        this.axis = d3.svg.axis();
        this.axis.orient(xy === "X" ? "bottom" : "left");
        this.axis.scale(this.scale);
        this.g = d3.select(g);
        this.lim = lim;
    }

    get lim(): [number, number] {
        const lim = this.scale.domain() as [number, number];
        console.assert(lim.length === 2);
        return lim;
    }

    set lim(val: [number, number]) {
        this.scale.domain(val);
        this.axis.tickValues(val);
        this.axis(this.g);
    }

    get pixelLim(): [number, number] {
        const scale = this.scale.range() as [number, number];
        console.assert(scale.length === 2);
        return scale;
    }

    set pixelLim(val: [number, number]) {
        this.scale.range(val);
        this.axis(this.g);
    }

    get tickSize(): number {
        return this.axis.outerTickSize();
    }

    set tickSize(val: number) {
        // .tickPadding(val * 0.5)
        this.axis.outerTickSize(val);
    }

    isPixelValid(pixel: number) {
        const lim = this.pixelLim;
        if (lim[0] > lim[1]) {
            return lim[1] <= pixel && pixel <= lim[0];
        } else {
            return lim[0] <= pixel && pixel <= lim[1];
        }
    }

    pixelAt(value: number) {
        return this.scale(value);
    }

    valueAt(pixel: number) {
        return this.scale.invert(pixel);
    }
}

export class Axes {
    // TODO: what should these actually be?
    static minHeight: number = 20;
    static minWidth: number = 20;

    x: Axis;
    y: Axis;
    view: AxesView;

    protected _height: number;
    protected _width: number;

    // TODO: have left xtick disappear if too close to right xtick?

    // TODO: probably don't have width, height passed in? get from view?
    constructor(
        plotView: PlotView,
        width,
        height,
        xlim: [number, number] = [-0.5, 0.0],
        ylim: [number, number] = [-1, 1]
    ) {
        this.view = plotView.axes;
        this._width = width;
        this._height = height;

        // TODO: better initial values for x?
        this.x = new Axis("X", this.view.x.g, xlim);
        this.y = new Axis("Y", this.view.y.g, ylim);

        // Set up mouse handlers for crosshairs
        plotView.overlay.addEventListener("mouseout", () => {
            this.view.crosshair.visible = false;
        });
        plotView.overlay.addEventListener("mousemove", (event: MouseEvent) => {
            const pt = utils.dom2svg(plotView.root, event.x, event.y);
            if (this.x.isPixelValid(pt.x) && this.y.isPixelValid(pt.y)) {
                this.view.crosshair.pos = [pt.x, pt.y];
                this.view.crosshair.value = [
                    this.x.valueAt(pt.x),
                    this.y.valueAt(pt.y)
                ];
                this.view.crosshair.visible = true;
            } else {
                this.view.crosshair.visible = false;
            }
        });

        // TODO: previosly, we hid on mouse wheel... should we?
        // this.view.root.addEventListener("mousewheel", () => {
        //     this.view.crosshairPos = ;
        // });
    }

    get height(): number {
        return this._height;
    }

    get padding(): [number, number] {
        return [5, 5];
    }

    set scale(val: [number, number]) {
        this._width = Math.max(Axes.minWidth, val[0]);
        this._height = Math.max(Axes.minHeight, val[1]);

        const [xWidth, xHeight] = this.view.x.scale;
        const [yWidth, yHeight] = this.view.y.scale;

        // TOOD: why 0 and not yWidth?
        this.view.x.pos = [0, this._height - xHeight];
        this.x.pixelLim = [yWidth, this._width];
        this.view.y.pos = [yWidth, 0];
        this.y.pixelLim = [this._height - xHeight, 0];
        this.view.crosshair.scale = [this._width, this._height - xHeight];
    }

    get width(): number {
        return this._width;
    }

    ondomadd() {
        this.scale = [this._width, this._height];
        const yWidth = this.view.y.scale[0];
        this.view.crosshair.offset = [0, yWidth];
        this.x.tickSize = 0.4 * yWidth;
        this.y.tickSize = 0.4 * yWidth;
    }
}

export abstract class Plot extends Widget {
    axes: Axes;
    view: PlotView;

    constructor(
        server: Connection,
        uid: string,
        view: PlotView,
        label: string,
        pos: Position,
        dimensions: number,
        synapse: number,
        labelVisible: boolean = true,
        xlim: [number, number] = [-0.5, 0],
        ylim: [number, number] = [-1, 1]
    ) {
        super(server, uid, view, label, pos, dimensions, synapse, labelVisible);
        this.synapse = synapse;
        this.view.dimensions = dimensions;

        this.addAxes(pos.width, pos.height, xlim, ylim);

        this.interactRoot.on("resizemove", event => {
            // Resizing the view happens in the superclass; we update axes here
            this.axes.scale = this.view.scale;
            this.syncWithDataStore();
        });

        window.addEventListener(
            "TimeSlider.timeShown",
            utils.throttle((event: CustomEvent) => {
                this.xlim = [
                    event.detail.timeShown - event.detail.shownWidth,
                    event.detail.timeShown
                ];
            }, 20) // Update once every 20 ms
        );
        window.addEventListener("SimControl.reset", e => {
            this.reset();
        });
    }

    get legendLabels(): string[] {
        return this.view.legendLabels;
    }

    set legendLabels(val: string[]) {
        this.view.legendLabels = val;
    }

    get legendVisible(): boolean {
        return this.view.legendVisible;
    }

    set legendVisible(val: boolean) {
        this.view.legendVisible = val;
    }

    get xlim(): [number, number] {
        return this.axes.x.lim;
    }

    set xlim(val: [number, number]) {
        this.axes.x.lim = val;
        this.syncWithDataStore();
    }

    get ylim(): [number, number] {
        return this.axes.y.lim;
    }

    set ylim(val: [number, number]) {
        this.axes.y.lim = val;
        this.syncWithDataStore();
    }

    addAxes(width, height, xlim, ylim) {
        this.axes = new Axes(this.view, width, height, xlim, ylim);
    }

    addMenuItems() {
        this.menu.addAction(
            "Hide legend",
            () => {
                this.legendVisible = false;
            },
            () => this.legendVisible
        );
        this.menu.addAction(
            "Show legend",
            () => {
                this.legendVisible = true;
            },
            () => !this.legendVisible
        );
        // TODO: give the legend its own context menu
        this.menu.addAction(
            "Set legend labels",
            () => {
                this.askLegend();
            },
            () => this.legendVisible
        );
        this.menu.addSeparator();
        super.addMenuItems();
    }

    askLegend() {
        const modal = new InputDialogView("Legend labels", "New value");
        modal.title = "Enter comma separated legend labels";
        modal.ok.addEventListener("click", () => {
            const labelCSV = modal.input.value;
            // No validation to do.
            // Empty entries assumed to be indication to skip modification.
            // Long strings okay.
            // Excissive entries get ignored.
            // TODO: Allow escaping of commas
            if (labelCSV !== null && labelCSV !== "") {
                this.legendLabels = labelCSV.split(",").map(s => s.trim());
            }
            $(modal).modal("hide");
        });
        utils.handleTabs(modal);
        $(modal.root).on("hidden.bs.modal", () => {
            document.body.removeChild(modal.root);
        });
        document.body.appendChild(modal.root);
        modal.show();
    }

    ondomadd() {
        super.ondomadd();
        this.axes.ondomadd();
    }

    scale(factor: number) {
        super.scale(factor);
        this.axes.scale = this.view.scale;
        this.syncWithDataStore();
    }
}

export class CrosshairView {
    x: SVGGElement;
    xLine: SVGLineElement;
    xText: SVGTextElement;
    y: SVGGElement;
    yLine: SVGLineElement;
    yText: SVGTextElement;

    constructor() {
        const crosshair = (xy: "X" | "Y") =>
            h(`g.crosshair.crosshair${xy}`, { styles: { display: "none" } }, [
                h("line", { x1: "0", x2: "0", y1: "0", y2: "0" }),
                h("text", { x: "0", y: "0" }, ["0.000"])
            ]);
        this.x = utils.domCreateSVG(crosshair("X")) as SVGGElement;
        this.y = utils.domCreateSVG(crosshair("Y")) as SVGGElement;
        this.xLine = this.x.querySelector("line");
        this.xText = this.x.querySelector("text");
        this.yLine = this.y.querySelector("line");
        this.yText = this.y.querySelector("text");
    }

    get offset(): [number, number] {
        return [
            Number(this.xLine.getAttribute("y1")),
            Number(this.yLine.getAttribute("x1"))
        ];
    }

    set offset(val: [number, number]) {
        this.xLine.setAttribute("y1", String(val[0]));
        this.yLine.setAttribute("x1", String(val[1]));
        this.yText.setAttribute("x", String(val[1]));
    }

    get pos(): [number, number] {
        return [
            Number(this.xLine.getAttribute("x1")),
            Number(this.yLine.getAttribute("y1"))
        ];
    }

    set pos(val: [number, number]) {
        this.xLine.setAttribute("x1", String(val[0]));
        this.xLine.setAttribute("x2", String(val[0]));
        this.yLine.setAttribute("y1", String(val[1]));
        this.yLine.setAttribute("y2", String(val[1]));
        this.xText.setAttribute("x", String(val[0]));
        this.yText.setAttribute("y", String(val[1]));
    }

    get scale(): [number, number] {
        return [
            Number(this.yLine.getAttribute("x2")),
            Number(this.xLine.getAttribute("y2"))
        ];
    }

    set scale(val: [number, number]) {
        this.yLine.setAttribute("x2", String(val[0]));
        this.xLine.setAttribute("y2", String(val[1]));
        this.xText.setAttribute("y", String(val[1]));
    }

    get value(): [number, number] {
        return [Number(this.xText.textContent), Number(this.yText.textContent)];
    }

    set value(val: [number, number]) {
        this.xText.textContent = val[0].toFixed(3);
        this.yText.textContent = val[1].toFixed(3);
    }

    get visible(): boolean {
        return this.x.style.display !== "none";
    }

    set visible(val: boolean) {
        if (val) {
            this.x.style.display = "";
            this.y.style.display = "";
        } else {
            this.x.style.display = "none";
            this.y.style.display = "none";
        }
    }
}

export class AxisView {
    g: SVGGElement;
    orientation: "horizontal" | "vertical";

    constructor(xy: "X" | "Y") {
        const node = h(`g.axis.axis${xy}.unselectable`, {
            transform: "translate(0,0)"
        });
        this.g = utils.domCreateSVG(node) as SVGGElement;
        this.orientation = xy === "X" ? "horizontal" : "vertical";
    }

    get pos(): [number, number] {
        return utils.getTranslate(this.g);
    }

    set pos(val: [number, number]) {
        utils.setTranslate(this.g, val[0], val[1]);
    }

    get scale(): [number, number] {
        const bbox = this.g.getBBox();
        return [bbox.width, bbox.height];
    }
}

export class AxesView {
    x: AxisView;
    y: AxisView;
    crosshair: CrosshairView;
    root: SVGGElement;

    constructor() {
        const node = h("g.axes");
        this.root = utils.domCreateSVG(node) as SVGGElement;
        this.x = new AxisView("X");
        this.y = new AxisView("Y");
        this.root.appendChild(this.x.g);
        this.root.appendChild(this.y.g);
        this.crosshair = new CrosshairView();
        this.root.appendChild(this.crosshair.x);
        this.root.appendChild(this.crosshair.y);
    }

    get fontSize(): number {
        // TODO: Number doesn't work here so we use parseFloat, but feels bad
        return parseFloat(window.getComputedStyle(this.root)["font-size"]);
    }

    get scale(): [number, number] {
        const [xWidth, xHeight] = this.x.scale;
        const [yWidth, yHeight] = this.y.scale;
        return [xWidth + yWidth, xHeight + yHeight];
    }
}

export class LegendView {
    colors: string[];
    root: SVGGElement;

    private _labels: SVGTextElement[] = [];
    private _legendItems: SVGGElement[] = [];
    private _values: SVGTextElement[] = [];

    constructor(colors: string[]) {
        this.colors = colors;
        const dimensions = this.colors.length;
        const node = h("g.legend", { transform: "translate(0,0)" });
        this.root = utils.domCreateSVG(node) as SVGGElement;
        this.numLabels = this.colors.length;
        this.labels = [];
    }

    get labels(): string[] {
        return this._labels.map(label => label.textContent);
    }

    set labels(val: string[]) {
        this._labels.forEach((label, i) => {
            if (i >= val.length) {
                label.textContent = `Dimension ${i + 1}`;
            } else {
                label.textContent = val[i];
            }
        });
    }

    get numLabels(): number {
        return this._legendItems.length;
    }

    set numLabels(val: number) {
        while (this._legendItems.length - val < 0) {
            this.addLabel();
        }
        while (this._legendItems.length - val > 0) {
            this.removeLabel();
        }
    }

    get pos(): [number, number] {
        return utils.getTranslate(this.root);
    }

    set pos(val: [number, number]) {
        utils.setTranslate(this.root, val[0], val[1]);
    }

    get valuesVisible(): boolean {
        return (
            this._values.length > 0 && this._values[0].style.display !== "none"
        );
    }

    set valuesVisible(val: boolean) {
        this._values.forEach(value => {
            value.style.display = val ? null : "none";
        });
    }

    set values(val: number[]) {
        console.assert(val.length === this.numLabels);
        this._values.forEach((value, i) => {
            value.textContent = val[i].toFixed(2);
        });
    }

    private addLabel() {
        const i = this._legendItems.length;
        const node = h("g.legend-item", [
            h("rect", {
                fill: this.colors[i % this.colors.length],
                height: "10",
                width: "10",
                y: `${i * 20}`
            }),
            h("text.legend-label", {
                x: "15",
                y: `${i * 20 + 9}`
            }),
            h("text.legend-value", {
                styles: { display: "none" }, // Hide by default
                y: `${i * 20 + 9}`
            })
        ]);
        const legendItem = utils.domCreateSVG(node) as SVGGElement;
        this.root.appendChild(legendItem);
        this._legendItems.push(legendItem);
        this._labels.push(legendItem.querySelector(
            "text.legend-label"
        ) as SVGTextElement);
        this._values.push(legendItem.querySelector(
            "text.legend-value"
        ) as SVGTextElement);
    }

    private removeLabel() {
        const legendItem = this._legendItems.pop();
        this._labels.pop();
        this._values.pop();
        if (legendItem != null) {
            this.root.removeChild(legendItem);
        }
    }
}

export abstract class PlotView extends ComponentView {
    axes: AxesView;
    colors: string[] = [];
    legend: LegendView;
    plot: SVGGElement;

    constructor() {
        super();
        this.axes = new AxesView();
        this.legend = new LegendView(this.colors);
        const node = h("g.plot");
        this.body = utils.domCreateSVG(node) as SVGGElement;
        this.body.appendChild(this.axes.root);
        this.body.appendChild(this.legend.root);
        this.root.appendChild(this.body);
    }

    get dimensions(): number {
        return this.colors.length;
    }

    set dimensions(val: number) {
        this.colors = utils.makeColors(val);
    }

    get legendLabels(): string[] {
        return this.legend.labels;
    }

    set legendLabels(val: string[]) {
        this.legend.labels = val;
    }

    get legendVisible(): boolean {
        return this.body.contains(this.legend.root);
    }

    set legendVisible(val: boolean) {
        if (val) {
            this.body.appendChild(this.legend.root);
        } else {
            this.body.removeChild(this.legend.root);
        }
    }

    get scale(): [number, number] {
        return this.overlayScale;
    }

    set scale(val: [number, number]) {
        const [width, height] = val;
        this.overlayScale = [width, height];
        this.legend.pos = [width + 2, 0];
    }

    protected updateLabel() {
        utils.setTranslate(this._label, this.overlayScale[0] * 0.5, 0);
    }
}
