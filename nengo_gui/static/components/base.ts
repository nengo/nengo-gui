import * as interact from "interact.js";
import * as d3 from "d3";

import { Network } from "./network";
import { config } from "../config";
import { DataStore } from "../datastore";
import { Menu } from "../menu";
import { NetGraph } from "../netgraph/main";
import { Connection, FastServerConnection } from "../server";
import * as utils from "../utils";
import {
    AxesView,
    ComponentView,
    ResizableComponentView,
    PlotView
} from "./views/base";
import { LegendView } from "./views/base";

import { InputDialogView } from "../views/modal";

export class Position {
    left: number;
    top: number;
    width: number | null;
    height: number | null;

    constructor(
        left: number = 0,
        top: number = 0,
        width: number = null,
        height: number = null
    ) {
        this.left = left;
        this.top = top;
        this.width = width;
        this.height = height;
    }
}

export abstract class Component {
    menu: Menu;

    uid: string;

    dimensions;

    interactRoot;

    protected server: Connection;
    protected _left: number;
    protected _scaleToPixels: number;
    protected _top: number;
    protected _view: ComponentView = null;

    constructor(
        server: Connection,
        uid: string,
        left: number,
        top: number,
        dimensions: number
    ) {
        this.server = server;
        this.uid = uid;
        this._left = left;
        this._top = top;

        this.dimensions = dimensions;

        this.menu = new Menu();
        this.addMenuItems();

        // TODO: nesting
        // if (parent !== null) {
        //     this.view.parent.children.push(this);
        // }

        this.interactRoot = interact(this.view.overlay);

        // TODO: Dicuss: previously, only plots had inertia. Should they all?
        this.interactRoot.draggable({ inertia: true });
        this.interactRoot.on("dragmove", event => {
            const [vLeft, vTop] = this.view.pos;
            this.view.pos = [vLeft + event.dx, vTop + event.dy];

            // TODO: redraw
            // this.redraw();
        });
        this.interactRoot.on("dragstart", () => {
            Menu.hideShown();
        });
        this.interactRoot.on("dragend", () => {
            this.syncWithView();
        });

        // --- Menu
        const toggleMenu = event => {
            if (Menu.shown !== null) {
                Menu.hideShown();
            } else {
                this.menu.show(event.clientX, event.clientY);
            }
            event.stopPropagation();
        };
        this.interactRoot.on("hold", event => {
            if (event.button === 0) {
                toggleMenu(event);
            }
        });
        // this.interactRoot.on("tap doubletap", (event) => {
        //     Menu.hideShown();
        // });
        this.interactRoot.on("contextmenu", event => {
            event.preventDefault();
            toggleMenu(event);
        });
    }

    get labelVisible(): boolean {
        return this.view.labelVisible;
    }

    set labelVisible(val: boolean) {
        this.view.labelVisible = val;
    }

    get left(): number {
        return this._left;
    }

    get scaleToPixels(): number {
        return this._scaleToPixels;
    }

    set scaleToPixels(val: number) {
        this._scaleToPixels = val;
        this.view.pos = [this._left * val, this._top * val];
    }

    get top(): number {
        return this._top;
    }

    abstract get view(): ComponentView;

    // get screenLocation() {
    //     const ngDims = this.ng.rect();
    //     let parentShiftX = 0;
    //     let parentShiftY = 0;
    //     let parent = this.parent;
    //     while (parent !== null) {
    //         parentShiftX = ((parentShiftX * parent.view.width * 2)
    //                             + (parent.view.x - parent.view.width));
    //         parentShiftY = ((parentShiftY * parent.view.height * 2)
    //                             + (parent.view.y - parent.view.height));
    //         parent = parent.view.parent;
    //     }
    //     parentShiftX *= ngDims.w;
    //     parentShiftY *= ngDims.h;
    //     let wScale = ngDims.w;
    //     let hScale = ngDims.h;
    //     if (this.parent !== null) {
    //         wScale *= this.parent.view.nestedWidth * 2;
    //         hScale *= this.parent.view.nestedHeight * 2;
    //     }
    //     return [this.x * wScale + parentShiftX + ngDims.offsetX,
    //             this.y * hScale + parentShiftY + ngDims.offsetY];
    // }

    get scales() {
        // let hScale = this.ng.scaledWidth;
        // let vScale = this.ng.scaledHeight;
        // let parent = this.parent;
        // while (parent !== null) {
        //     hScale *= parent.view.width * 2;
        //     vScale *= parent.view.height * 2;
        //     parent = parent.view.parent;
        // }
        // console.assert(!isNaN(hScale));
        // console.assert(!isNaN(vScale));
        // return {hor: hScale, vert: vScale};
        return "todo";
    }

    addMenuItems() {}

    // TODO: constrainPosition
    // constrainPosition() {
    //     if (this.parent !== null) {
    //         this.width = Math.min(0.5, this.width);
    //         this.height = Math.min(0.5, this.height);

    //         this.x = Math.min(this.x, 1.0 - this.width);
    //         this.x = Math.max(this.x, this.width);

    //         this.y = Math.min(this.y, 1.0 - this.height);
    //         this.y = Math.max(this.y, this.height);
    //     }
    // }

    requestFeedforwardLayout() {
        // this.ng.notify("feedforwardLayout", {uid: this.uid});
    }

    remove() {
        // Remove the item from the parent's children list
        // if (this.view.parent !== null) {
        //     const index = this.view.parent.children.indexOf(this);
        //     this.view.parent.children.splice(index, 1);
        // }
        // super.remove();
        // this.miniItem.remove();
    }

    // TODO: rename to createComponent?
    createGraph(graphType, args = null) {
        // tslint:disable-line
        // TODO: get nested implemented this
        // const w = this.nestedWidth;
        // const h = this.nestedHeight;
        // const pos = this.view.screenLocation;
        const w = this.view.width;
        const h = this.view.height;

        // TODO: implement an interface for this and rename it
        const info: any = {
            // height: this.ng.viewPort.fromScreenY(100),
            // type: graphType,
            // uid: this.uid,
            // width: this.ng.viewPort.fromScreenX(100),
            // x: this.ng.viewPort.fromScreenX(pos[0])
            //     - this.ng.viewPort.shiftX(w),
            // y: this.ng.viewPort.fromScreenY(pos[1])
            //     - this.ng.viewPort.shiftY(h),
        };

        if (args !== null) {
            info.args = args;
        }

        if (info.type === "Slider") {
            info.width /= 2;
        }

        // TODO: change this to an actual function call
        // this.ng.notify("createGraph", info);
    }

    ondomadd() {
        this.view.ondomadd();
        this.scaleToPixels = 1; // TODO: get from somewhere
    }

    onnetadd(network: Network) {
        this.interactRoot.draggable({
            restrict: { restriction: network.view.root }
        });
    }

    onnetgraphadd(netgraph: NetGraph) {}

    syncWithView = utils.throttle(() => {
        const [left, top] = this.view.pos;
        this._left = left / this.scaleToPixels;
        this._top = top / this.scaleToPixels;
    }, 20);
}

export abstract class ResizableComponent extends Component {
    static resizeOptions: any = {
        edges: { bottom: true, left: true, right: true, top: true },
        invert: "none",
        margin: 10
        // restrict: {
        //     restriction: {
        //         bottom: 600,
        //         left: 0,
        //         right: 600,
        //         top: 0,
        //     }
        // }
    };

    protected _height: number;
    protected _view: ResizableComponentView;
    protected _width: number;

    // TODO: Add all things to constructor
    constructor(
        server: Connection,
        uid: string,
        left: number,
        top: number,
        width: number,
        height: number,
        dimensions: number
    ) {
        super(server, uid, left, top, dimensions);

        this._height = height;
        this._width = width;

        this.interactRoot.resizable(this.resizeOptions);
        this.interactRoot.on("resizestart", event => {
            Menu.hideShown();
        });
        this.interactRoot.on("resizemove", event => {
            const dRect = event.deltaRect;
            const [vLeft, vTop] = this.view.pos;
            const [vWidth, vHeight] = this.view.scale;

            this.view.pos = [vLeft + dRect.left, vTop + dRect.top];
            this.view.scale = [vWidth + dRect.width, vHeight + dRect.height];
            // this.view.contSize(event);
            // this.redraw();
        });
        this.interactRoot.on("resizeend", event => {
            const [vWidth, vHeight] = this.view.scale;
            this._width = vWidth / this.scaleToPixels;
            this._height = vHeight / this.scaleToPixels;

            // this.view.constrainPosition();
            // this.redraw();

            // TODO: turn this into an actual function call
            // this.ng.notify("posSize", {
            //     height: this.view.height,
            //     uid: this.uid,
            //     width: this.view.width,
            //     x: this.view.x,
            //     y: this.view.y,
            // });
        });
    }

    get height(): number {
        return this._height;
    }

    get resizeOptions(): any {
        return ResizableComponent.resizeOptions;
    }

    get scaleToPixels(): number {
        return this._scaleToPixels;
    }

    set scaleToPixels(val: number) {
        this._scaleToPixels = val;
        this.view.pos = [this._left * val, this._top * val];
        this.view.scale = [this._width * val, this._height * val];
    }

    abstract get view(): ResizableComponentView;

    get width(): number {
        return this._width;
    }

    onnetadd(network: Network) {
        this.interactRoot.resizable({
            restrict: { restriction: network.view.root }
        });
        super.onnetadd(network);
    }
}

export abstract class Widget extends ResizableComponent {
    currentTime: number = 0.0;
    datastore: DataStore;
    synapse: number;

    constructor(
        server: Connection,
        uid: string,
        left: number,
        top: number,
        width: number,
        height: number,
        dimensions: number,
        synapse: number
    ) {
        super(server, uid, left, top, width, height, dimensions);
        this.synapse = synapse;
        this.datastore = new DataStore(this.dimensions, 0.0);

        window.addEventListener(
            "TimeSlider.moveShown",
            utils.throttle((e: CustomEvent) => {
                this.currentTime = e.detail.shownTime[1];
            }, 50) // Update once every 50 ms
        );
    }

    /**
     * Receive new line data from the server.
     */
    add(data: number[]) {
        // TODO: handle this in the websocket code
        // const size = this.dimensions + 1;
        // // Since multiple data packets can be sent with a single event,
        // // make sure to process all the packets.
        // while (data.length >= size) {
        //     this.datastore.push(data.slice(0, size));
        //     data = data.slice(size);
        // }
        // if (data.length > 0) {
        //     console.warn("extra data: " + data.length);
        // }
        if (data.length !== this.dimensions + 1) {
            console.error(
                `Got data with ${data.length - 1} dimensions; ` +
                    `should be ${this.dimensions} dimensions.`
            );
        } else {
            this.datastore.add(data);
            this.syncWithDataStore();
        }
    }

    addMenuItems() {
        this.menu.addAction("Set synapse...", () => {
            this.askSynapse();
        });
        this.menu.addAction(
            "Hide label",
            () => {
                this.labelVisible = false;
                // see component.interactRoot.on("dragend resizeend")
                // this.saveLayout();
            },
            () => this.labelVisible
        );
        this.menu.addAction(
            "Show label",
            () => {
                this.labelVisible = true;
                // see component.interactRoot.on("dragend resizeend")
                // this.saveLayout();
            },
            () => !this.labelVisible
        );
        // TODO: attachNetGraph
        // this.menu.addAction("Remove", () => { this.remove(); });

        super.addMenuItems();
    }

    askSynapse() {
        const modal = new InputDialogView(
            String(this.synapse),
            "Synaptic filter time constant (in seconds)",
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
                }
            }
        });
        $(modal.root).on("hidden.bs.modal", () => {
            document.body.removeChild(modal.root);
        });
        document.body.appendChild(modal.root);
        modal.show();
    }

    reset() {
        this.datastore.reset();
    }

    syncWithDataStore: () => void;
}

export class Axis {
    private axis: d3.svg.Axis;
    private g: d3.Selection<SVGGElement>;
    private scale: d3.scale.Linear<number, number>;

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
        valueView: PlotView,
        width,
        height,
        xlim: [number, number] = [-0.5, 0.0],
        ylim: [number, number] = [-1, 1]
    ) {
        this.view = valueView.axes;
        this._width = width;
        this._height = height;

        // TODO: better initial values for x?
        this.x = new Axis("X", this.view.x.g, xlim);
        this.y = new Axis("Y", this.view.y.g, ylim);

        // Set up mouse handlers for crosshairs
        valueView.overlay.addEventListener("mouseover", () => {
            this.view.crosshair.visible = true;
        });
        valueView.overlay.addEventListener("mouseout", () => {
            this.view.crosshair.visible = false;
        });
        valueView.overlay.addEventListener("mousemove", (event: MouseEvent) => {
            const [offsetX, offsetY] = valueView.pos;
            const [x, y] = [event.x - offsetX, event.y - offsetY];
            this.view.crosshair.pos = [x, y];
            this.view.crosshair.value = [this.x.valueAt(x), this.y.valueAt(y)];
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

    protected _view: PlotView;

    constructor(
        server: Connection,
        uid: string,
        left: number,
        top: number,
        width: number,
        height: number,
        dimensions: number,
        synapse: number,
        xlim: [number, number] = [-0.5, 0],
        ylim: [number, number] = [-1, 1]
    ) {
        super(server, uid, left, top, width, height, dimensions, synapse);
        this.synapse = synapse;

        this.addAxes(width, height, xlim, ylim);

        this.interactRoot.on("resizemove", event => {
            // Resizing the view happens in the superclass; we update axes here
            const [vWidth, wHeight] = this.view.scale;
            this.axes.scale = [
                vWidth * this.scaleToPixels,
                wHeight * this.scaleToPixels
            ];
            this.syncWithDataStore();
        });

        window.addEventListener(
            "TimeSlider.moveShown",
            utils.throttle((e: CustomEvent) => {
                this.xlim = e.detail.shownTime;
            }, 50) // Update once every 50 ms
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

    abstract get view(): PlotView;

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
}
