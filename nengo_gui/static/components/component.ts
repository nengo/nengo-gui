import * as interact from "interact.js";
import { h } from "maquette";

import { config } from "../config";
import { Menu } from "../menu";
import { NetGraph } from "../netgraph/main";
import { Network } from "./network";
import { AxesView, LegendView, PlotView } from "./plot";
import { Connection, FastServerConnection } from "../server";
import * as utils from "../utils";

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

export abstract class ComponentView {
    static labelPad: number = 3;

    baseHeight: number;
    baseWidth: number;
    body: SVGGElement;
    overlay: SVGRectElement;
    root: SVGGElement;

    protected _label: SVGTextElement;
    protected _width: number;

    constructor(label: string) {
        const node = h("g", { transform: "translate(0,0)" }, [
            h("text", { transform: "translate(0,0)" }, [label]),
            h("rect.overlay")
        ]);

        // Create the SVG group to hold this item's shape and it's label
        this.root = utils.domCreateSVG(node) as SVGGElement;
        this.overlay = this.root.querySelector(".overlay") as SVGRectElement;
        this._label = this.root.querySelector("text") as SVGTextElement;
    }

    get centerPos(): [number, number] {
        const pos = this.pos;
        return [pos[0] + this.width * 0.5, pos[1] + this.height * 0.5];
    }

    get height(): number {
        return this.baseHeight;
    }

    get label(): string {
        return this._label.textContent;
    }

    set label(val: string) {
        this._label.textContent = val;
    }

    get labelVisible(): boolean {
        return this._label.style.display === "";
    }

    set labelVisible(val: boolean) {
        if (val) {
            this._label.style.display = "";
        } else {
            this._label.style.display = "none";
        }
    }

    get left(): number {
        return this.pos[0];
    }

    get overlayScale(): [number, number] {
        return [
            Number(this.overlay.getAttribute("width")),
            Number(this.overlay.getAttribute("height"))
        ];
    }

    set overlayScale(val: [number, number]) {
        const [width, height] = val;
        this.overlay.setAttribute("width", `${width}`);
        this.overlay.setAttribute("height", `${height}`);
        utils.setTranslate(
            this._label,
            width * 0.5,
            height + ComponentView.labelPad
        );
    }

    get pos(): [number, number] {
        return utils.getTranslate(this.root);
    }

    set pos(val: [number, number]) {
        utils.setTranslate(this.root, val[0], val[1]);
    }

    get top(): number {
        return this.pos[1];
    }

    get width(): number {
        return this.baseWidth;
    }

    ondomadd() {
        const rect = this.body.getBoundingClientRect();
        this.baseHeight = rect.height;
        this.baseWidth = rect.width;
        this.overlayScale = [this.baseWidth, this.baseHeight];
        // Ensure that overlay is on top
        this.root.appendChild(this.overlay);
    }
}

export abstract class ResizableComponentView extends ComponentView {
    static minHeight: number = 20;
    static minWidth: number = 20;

    get height(): number {
        return this.scale[1];
    }

    get width(): number {
        return this.scale[0];
    }

    abstract get scale(): [number, number];
    abstract set scale(val: [number, number]);
}
