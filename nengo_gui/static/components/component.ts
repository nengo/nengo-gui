import * as interact from "interact.js";
import { h } from "maquette";

import "./component.css";

import { config } from "../config";
import { Menu } from "../menu";
import { NetGraph } from "../netgraph/main";
import { Network } from "./network";
import { AxesView, LegendView, PlotView } from "./plot";
import { Position } from "./position";
import { Connection, FastServerConnection } from "../server";
import * as utils from "../utils";

export abstract class Component {
    interactRoot;
    menu: Menu;
    uid: string;
    view: ComponentView;

    protected server: Connection;

    protected static resizeDefaults = {
        edges: { bottom: true, left: true, right: true, top: true },
        invert: "none",
        margin: 10
    };

    constructor(
        server: Connection,
        uid: string,
        view: ComponentView,
        label: string,
        pos: Position,
        labelVisible: boolean = true
    ) {
        this.server = server;
        this.uid = uid;
        this.view = view;
        this.view.pos = [pos.left, pos.top];
        this.view.scale = [pos.width, pos.height];
        this.label = label;
        this.labelVisible = labelVisible;

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
            const [left, top] = this.view.pos;
            this.view.pos = [left + event.dx, top + event.dy];
        });
        this.interactRoot.on("dragstart", () => {
            Menu.hideShown();
        });
        this.interactRoot.on("dragend", () => {
            // TODO: do something to update config, communicate to server?
            // this.syncWithView();
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

        const resizeOptions = this.resizeOptions;
        if (resizeOptions != null) {
            this.interactRoot.resizable(this.resizeOptions);
            this.interactRoot.on("resizestart", event => {
                Menu.hideShown();
            });
            this.interactRoot.on("resizemove", event => {
                const dRect = event.deltaRect;
                const [left, top] = this.view.pos;
                const [width, height] = this.view.scale;
                this.view.pos = [left + dRect.left, top + dRect.top];
                this.view.scale = [width + dRect.width, height + dRect.height];
                // this.view.contSize(event);
                // this.redraw();
            });
            this.interactRoot.on("resizeend", event => {
                // this.view.constrainPosition();

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
    }

    get label(): string {
        return this.view.label;
    }

    set label(val: string) {
        this.view.label = val;
    }

    get labelVisible(): boolean {
        return this.view.labelVisible;
    }

    set labelVisible(val: boolean) {
        this.view.labelVisible = val;
    }

    get pos(): [number, number] {
        return this.view.pos;
    }

    set pos(val: [number, number]) {
        this.view.pos = val;
    }

    get resizeOptions(): any {
        // Note: return null to make not resizable
        return Component.resizeDefaults;
    }

    addMenuItems() {}

    // TODO: rename to createComponent?
    createGraph(graphType, args = null) {
        // tslint:disable-line
        // TODO: get nested implemented this
        // const w = this.nestedWidth;
        // const h = this.nestedHeight;
        // const pos = this.view.screenLocation;
        // const w = this.view.width;
        // const h = this.view.height;

        // TODO: implement an interface for this and rename it
        // const info: any = {
            // height: this.ng.viewPort.fromScreenY(100),
            // type: graphType,
            // uid: this.uid,
            // width: this.ng.viewPort.fromScreenX(100),
            // x: this.ng.viewPort.fromScreenX(pos[0])
            //     - this.ng.viewPort.shiftX(w),
            // y: this.ng.viewPort.fromScreenY(pos[1])
            //     - this.ng.viewPort.shiftY(h),
        // };

        // if (args !== null) {
        //     info.args = args;
        // }

        // if (info.type === "Slider") {
        //     info.width /= 2;
        // }

        // TODO: change this to an actual function call
        // this.ng.notify("createGraph", info);
    }

    ondomadd() {
        this.view.ondomadd();
    }

    onnetadd(network: Network) {
        this.interactRoot.draggable({
            restrict: { restriction: network.view.root }
        });
        if (this.resizeOptions != null) {
            this.interactRoot.resizable({
                restrict: { restriction: network.view.root }
            });
        }
    }

    onnetgraphadd(netgraph: NetGraph) {}

    scale(factor: number) {
        const [left, top] = this.view.pos;
        this.view.pos = [left * factor, top * factor];
        const [width, height] = this.view.scale;
        this.view.scale = [width * factor, height * factor];
    }
}

export abstract class ComponentView {
    body: SVGGElement;
    overlay: SVGRectElement;
    root: SVGGElement;

    protected _label: SVGTextElement;

    constructor() {
        const node = h("g", { transform: "translate(0,0)" }, [
            h("text.component-label", { transform: "translate(0,0)" }),
            h("rect.overlay")
        ]);

        // Create the SVG group to hold this item's shape and it's label
        this.root = utils.domCreateSVG(node) as SVGGElement;
        this.overlay = this.root.querySelector(".overlay") as SVGRectElement;
        this._label = this.root.querySelector("text") as SVGTextElement;
    }

    get centerPos(): [number, number] {
        const [width, height] = this.overlayScale;
        const [left, top] = this.pos;
        return [left + width * 0.5, top + height * 0.5];
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
        this.updateLabel();
    }

    get pos(): [number, number] {
        return utils.getTranslate(this.root);
    }

    set pos(val: [number, number]) {
        utils.setTranslate(this.root, val[0], val[1]);
        this.updateLabel();
    }

    get scale(): [number, number] {
        return this.overlayScale;
    }

    set scale(val: [number, number]) {
        this.overlayScale = val;
    }

    protected updateLabel() {
        const [width, height] = this.overlayScale;
        utils.setTranslate(
            this._label,
            width * 0.5,
            height + this._label.getBBox().height
        );
    }

    ondomadd() {
        // Since label position depends on actual size, reposition once added
        this.scale = this.scale;

        // Ensure that overlay is on top
        this.root.appendChild(this.overlay);
    }
}
