import * as interact from "interact.js";

import { config } from "../config";
import { DataStore } from "../datastore";
import { Menu } from "../menu";
import * as utils from "../utils";
import { ViewPort } from "../viewport";
import {
    ComponentView, ResizableComponentView,
} from "./views/base";
import { InputDialogView } from "../views/modal";
import { FastWSConnection } from "../websocket";

/**
 * Base class for any element that is added to the NetGraph.
 */
// export abstract class Component {
    // static minHeight: number = 2;
    // static minWidth: number = 2;

    // interactable;

    // h: number;
    // height: number;
    // label: HTMLDivElement;
    // menu: Menu;
    // minHeight: number;
    // minWidth: number;
    // parent: HTMLElement;
    // uid: string;
    // w: number;
    // width: number;
    // ws;
    // viewPort: ViewPort;
    // x: number;
    // y: number;

    // view: ComponentView;

    // constructor(parent, x, y, width, height, viewPort, label, labelVisible, uid) {

        // this.interactable = interact(this.view.root);

        // Prevent interact from messing up cursor
        // this.interactable.styleCursor(true);

        // this.x = x;
        // this.y = y;
        // this.w = width;
        // this.h = height;
        // this.viewPort = viewPort;

        // this.redrawSize();
        // this.redrawPos();

        // TODO: parent needed?
        // parent.appendChild(this.div);
        // this.parent = parent;
        // this.view.labelVisible = labelVisible;

        // this.interactable.on("dragmove", (event) => {
        //     this.x += this.viewPort.fromScreenX(event.dx);
        //     this.y += this.viewPort.fromScreenY(event.dy);
        //     this.redrawPos();
        // });
        // this.interactable.on("dragstart", () => {
        //     Menu.hideShown();
        // });

        // Allow element to be resized
        // this.interactable.resizable({
        //     edges: {bottom: true, left: true, right: true, top: true},
        // });
        // this.interactable.on("resizestart", (event) => {
        //     Menu.hideShown();
        // });
        // this.interactable.on("resizemove", (event) => {
        //     const newWidth = event.rect.width;
        //     const newHeight = event.rect.height;
        //     const dleft = event.deltaRect.left;
        //     const dtop = event.deltaRect.top;
        //     const dright = event.deltaRect.right;
        //     const dbottom = event.deltaRect.bottom;

        //     this.x += this.viewPort.fromScreenX((dleft + dright) / 2);
        //     this.y += this.viewPort.fromScreenY((dtop + dbottom) / 2);

        //     this.w = this.viewPort.unscaleWidth(newWidth);
        //     this.h = this.viewPort.unscaleHeight(newHeight);

        //     this.onresize(newWidth, newHeight);
        //     this.redrawSize();
        //     this.redrawPos();
        // })

        // Open a WebSocket to the server
        // this.uid = uid;
        // if (this.uid !== undefined) {
            // this.ws = new FastWSConnection(this.uid);
            // this.ws.onmessage = (message) => {
            //     this.onMessage(message);
            // };
        // }

        // this.menu = new Menu();
        // this.addMenuItems();

        // interact(this.view.root)
        //     .on("hold", (event) => { // Change to 'tap' for right click
        //         if (event.button === 0) {
        //             if (Menu.shown !== null) {
        //                 Menu.hideShown();
        //             } else {
        //                 this.menu.show(event.clientX, event.clientY);
        //             }
        //             event.stopPropagation();
        //         }
        //     })
        //     .on("tap", (event) => { // Get rid of menus when clicking off
        //         if (event.button === 0) {
        //             if (Menu.shown !== null) {
        //                 Menu.hideShown();
        //             }
        //         }
        //     });
        // window.addEventListener("contextmenu", (event) => {
        //     event.preventDefault();
        //     event.stopPropagation();
        //     if (Menu.shown !== null) {
        //         Menu.hideShown();
        //     } else {
        //         this.menu.show(event.clientX, event.clientY);
        //     }
        //     return false;
        // });
    // }

    /**
     * Do any visual updates needed due to changes in the underlying data.
     */
    // TODO: ensure this is throttled
    // abstract update(event);

//     updateLayout(config) {
//         this.w = config.width;
//         this.h = config.height;
//         this.x = config.x;
//         this.y = config.y;

//         this.redrawSize();
//         this.redrawPos();
//         // this.onresize(
//         //     this.viewPort.scaleWidth(this.w),
//         //     this.viewPort.scaleHeight(this.h),
//         // );

//         this.labelVisible = config.labelVisible;
//     }

//     redrawSize() {
//         this.width = this.viewPort.scaleWidth(this.w);
//         this.height = this.viewPort.scaleHeight(this.h);
//         // this.view.scale = [this.width, this.height];
//     }

//     redrawPos() {
//         const x = this.viewPort.toScreenX(this.x - this.w);
//         const y = this.viewPort.toScreenY(this.y - this.h);
//         // utils.setTransform(this.div, x, y);
//     }
// }

export abstract class Component {
    minimap;
    miniItem;
    _labelBelow: boolean;
    menu: Menu;

    // TODO: do we want to track connections here...?
    childConnections;
    children;
    connIn = []; // NetGraphConnections leading into this item
    connOut = []; // NetGraphConnections leading out of this item

    uid: string;

    dimensions;

    interactable;

    protected _left: number;
    protected _scaleToPixels: number;
    protected _top: number;
    protected _view: ComponentView = null;

    constructor(
        left: number,
        top: number,
        parent: string,
        uid: string,
        dimensions: number,
        miniItem = null,
    ) {
        this.uid = uid;
        this._left = left;
        this._top = top;

        this.miniItem = miniItem;

        this.menu = new Menu();
        this.addMenuItems();

        // TODO: nesting
        // if (parent !== null) {
        //     this.view.parent.children.push(this);
        // }

        this.interactable = interact(this.view.overlay);

        // TODO: Dicuss: previously, only plots had inertia. Should they all?
        this.interactable.draggable({inertia: true});
        this.interactable.on("dragmove", (event) => {
            const [left, top] = this.view.pos;
            this.view.pos = [left + event.dx, top + event.dy];

            // TODO: redraw
            // this.redraw();

            // TODO: minimap
            // if (this.view.depth === 1) {
            //     this.ng.scaleMiniMap();
            // }
        });
        this.interactable.on("dragstart", () => {
            Menu.hideShown();
        });
        this.interactable.on("dragend", () => {
            const [left, top] = this.view.pos;
            this._left = left / this.scaleToPixels;
            this._top = top / this.scaleToPixels;
        });

        // --- Menu
        const toggleMenu = (event) => {
            if (Menu.shown !== null) {
                Menu.hideShown();
            } else {
                this.menu.show(event.clientX, event.clientY);
            }
            event.stopPropagation();
        };
        this.interactable.on("hold", (event) => {
            if (event.button === 0) {
                toggleMenu(event);
            }
        });
        // this.interactable.on("tap doubletap", (event) => {
        //     Menu.hideShown();
        // });
        this.interactable.on("contextmenu", (event) => {
            event.preventDefault();
            toggleMenu(event);
        });
    }

    // _getScreenW() {
    //     return this.view.nestedWidth * this.ng.width * this.ng.scale;
    // }

    // _getScreenH() {
    //     return this.view.nestedHeight * this.ng.height * this.ng.scale;
    // }

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

    // TODO: minimap
    // get minMaxXY() {
    //     const minX = this.x - this.width;
    //     const maxX = this.x + this.width;
    //     const minY = this.y - this.height;
    //     const maxY = this.y + this.height;
    //     return [minX, maxX, minY, maxY];
    // }

    get scales(){
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

    addMenuItems() {
        // TODO: only for network?
        this.menu.addAction("Auto-layout", () => {
            this.requestFeedforwardLayout();
        });
    }

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

    createModal() {
        // this.ng.notify("createModal", {
        //     connInUids: this.connIn.map((c) => {
        //         return c.uid;
        //     }),
        //     connOutUids: this.connOut.map((c) => {
        //         return c.uid;
        //     }),
        //     uid: this.uid,
        // });
    }

    // TODO: redraw
    // redrawConnections() {
    //     for (const conn of this.connIn) {
    //         conn.redraw();
    //     }
    //     for (const conn of this.connOut) {
    //         conn.redraw();
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

    // TODO: redraw
    // redraw() {
    //     this.view.redrawSize();
    //     if (this.ng.mmDisplay) {
    //         this.miniItem.redraw();
    //     }

    //     this.view.redrawPosition();
    //     this.redrawConnections();
    // }

    set labelBelow(flag) {
        // if (flag && !this._labelBelow) {
        //     const screenH = this.view.screenHeight;
        //     this.view.moveLabel(screenH / 2);
        // } else if (!flag && this._labelBelow) {
        //     this.view.moveLabel(0);
        // }
    }

    // TODO: rename to createComponent?
    createGraph(graphType, args=null) { // tslint:disable-line
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
}

export abstract class ResizableComponent extends Component {

    // TODO: do we need viewport anymore?

    static resizeOptions: any = {
        edges: {bottom: true, left: true, right: true, top: true},
        invert: "none",
        margin: 10,
        restrict: {
            restriction: {
                bottom: 600,
                left: 0,
                right: 600,
                top: 0,
            }
        }
    };

    protected _height: number;
    protected _view: ResizableComponentView;
    protected _width: number;

    // TODO: Add all things to constructor
    constructor(
        left: number,
        top: number,
        width: number,
        height: number,
        parent: string,
        uid: string,
        dimensions: number,
        miniItem = null,
    ) {
        super(left, top, parent, uid, dimensions, miniItem);

        this._height = height;
        this._width = width;

        this.interactable.resizable(this.resizeOptions);
        this.interactable.on("resizestart", (event) => {
            Menu.hideShown();
        });
        this.interactable.on("resizemove", (event) => {
            const dRect = event.deltaRect;
            const [left, top] = this.view.pos;
            const [width, height] = this.view.scale;

            this.view.pos = [left + dRect.left, top + dRect.top];
            this.view.scale = [width + dRect.width, height + dRect.height];
            // this.view.contSize(event);
            // this.redraw();

            // if (this.view.depth === 1) {
            //     this.ng.scaleMiniMap();
            // }
        });
        this.interactable.on("resizeend", (event) => {
            const [width, height] = this.view.scale;
            this._width = width / this.scaleToPixels;
            this._height = height / this.scaleToPixels;

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

}

export abstract class Plot extends ResizableComponent {

    datastore: DataStore;

    constructor(
        left: number,
        top: number,
        width: number,
        height: number,
        parent: string,
        uid: string,
        dimensions: number,
        miniItem = null,
    ) {
        super(left, top, width, height, parent, uid, dimensions, miniItem);

        // For storing the accumulated data
        this.datastore = new DataStore(this.dimensions, 0.0);
    }

    addMenuItems() {

        this.menu.addAction("Hide label", () => {
            this.labelVisible = false;
            // see component.interactable.on("dragend resizeend")
            // this.saveLayout();
        }, () => this.labelVisible)
        this.menu.addAction("Show label", () => {
            this.labelVisible = true;
            // see component.interactable.on("dragend resizeend")
            // this.saveLayout();
        }, () => !this.labelVisible);
        // TODO: attachNetGraph
        // this.menu.addAction("Remove", () => { this.remove(); });
    }

}

export abstract class Widget extends Component {

}
