import { h } from "maquette";

import { domCreateSvg, Shape } from "../../../utils";
import { InteractableItemArg } from "../interactable";
import { NetGraphItemArg } from "../item";
import { NetGraphItemView } from "./item";

export abstract class InteractableView extends NetGraphItemView {
    _label: SVGTextElement;

    constructor(ngiArg: NetGraphItemArg, interArg: InteractableItemArg) {
        super(ngiArg);

        const labelNode = h("text", {innerHTML: interArg.label, transform: ""});
        this._label = domCreateSvg(labelNode) as SVGTextElement;
        this.g.appendChild(this._label);

        this._renderShape();
    }

    set label(label) {
        this._label.setAttribute("innerHTML", label);
    }

    set height(val: number) {
        this._h = val;
        // this.miniItem.height = val;
    }

    set width(val: number) {
        this._w = val;
        // this.miniItem.width = val;
    }

    // reimplement once the minimap is implemented
    // _getScreenW() {
    //     return this.view.nestedWidth * this.ng.width * this.ng.scale;
    // }

    // _getScreenH() {
    //     return this.view.nestedHeight * this.ng.height * this.ng.scale;
    // }

    set x(val: number) {
        console.assert(!isNaN(val));
        this._x = val;
        // this.miniItem.x = val;
    }

    set y(val: number) {
        console.assert(!isNaN(val));
        this._y = val;
        // this.miniItem.y = val;
    }

    get scales(){
        let hScale = this.ng.scaledWidth;
        let vScale = this.ng.scaledHeight;
        let parent = this.parent;
        while (parent !== null) {
            hScale *= parent.view.width * 2;
            vScale *= parent.view.height * 2;
            parent = parent.view.parent;
        }
        console.assert(!isNaN(hScale));
        console.assert(!isNaN(vScale));
        return {hor: hScale, vert: vScale};
    }

    move(event) {
        const scale = this.scales;
        this.x += event.dx / scale.hor;
        this.y += event.dy / scale.vert;
    }

    moveLabel(vertPos: number) {
        this.label.setAttribute(
            "transform",
            `translate(0, ${vertPos})`,
        );
    }

    abstract _renderShape()

    redrawSize(): Shape {
        const screenD = this.displayedShape;
        this._label.setAttribute(
         "transform",
         `translate(0, ${screenD.height / 2})`,
        );
        return screenD;
    }

    constrainPosition() {
        if (this.parent !== null) {
            this.width = Math.min(0.5, this.width);
            this.height = Math.min(0.5, this.height);

            this.x = Math.min(this.x, 1.0 - this.width);
            this.x = Math.max(this.x, this.width);

            this.y = Math.min(this.y, 1.0 - this.height);
            this.y = Math.max(this.y, this.height);
        }
    }
}

export class PassthroughView extends InteractableView {
    fixedHeight: number;
    fixedWidth: number;

    constructor(ngiArg: NetGraphItemArg, interArg: InteractableItemArg) {
        super(ngiArg, interArg);

        // TODO: WTF can this be avoided?
        // I have to make a sepcific minimap subclass for this...
        // or something better?
        // if (this.minimap === false) {
        //     this.fixedWidth = 10;
        //     this.fixedHeight = 10;
        // } else {
        //     this.fixedWidth = 3;
        //     this.fixedHeight = 3;
        // }
        this.fixedWidth = 3;
        this.fixedHeight = 3;
    }

    _getScreenWidth() {
        return this.fixedWidth;
    }

    _getScreenHeight() {
        return this.fixedHeight;
    }

    // this is probably going to need to be refactored
    _renderShape() {
        const shape = h("ellipse.passthrough");
        this.shape = domCreateSvg(shape);
        this.g.appendChild(this.shape);
    }

    redrawSize() {
        const screenD = super.redrawSize();

        this.shape.setAttribute("rx", String(screenD.width / 2));
        this.shape.setAttribute("ry", String(screenD.height / 2));

        return screenD;
    }
}
