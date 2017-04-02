import { h, VNode } from "maquette";

import { domCreateSvg, Shape } from "../../../utils";
import { InteractableItemArg } from "../interactable";
import { NetGraphItemArg } from "../item";
import { InteractableView } from "./interactable";

export abstract class ResizeableView extends InteractableView {
    area: SVGElement;

    constructor(ngiArg: NetGraphItemArg, interArg: InteractableItemArg) {
        super(ngiArg, interArg);

        const area = h("rect", {fill: "transparent"});
        this.area = domCreateSvg(area);
        this.g.appendChild(this.area);
    }

    contSize(event) {
        const scale = this.scales;
        const dw = event.deltaRect.width / scale.hor / 2;
        const dh = event.deltaRect.height / scale.vert / 2;
        const offsetX = dw + event.deltaRect.left / scale.hor;
        const offsetY = dh + event.deltaRect.top / scale.vert;

        this.width += dw;
        this.height += dh;
        this.x += offsetX;
        this.y += offsetY;
    }

    redrawSize(): Shape {
        // redraws the label
        const screenD = super.redrawSize();

        const areaW = screenD.width;
        const areaH = screenD.height;
        this.area.setAttribute(
            "transform",
            `translate(-${areaW / 2}, -${areaH / 2})`,
        );
        this.area.setAttribute("width", String(areaW));
        this.area.setAttribute("height", String(areaH));

        this.shape.setAttribute("width", String(screenD.width));
        this.shape.setAttribute("height", String(screenD.height));

        return screenD;
    }
}

export class NodeView extends ResizeableView {
    radiusScale: number;

    constructor(ngiArg: NetGraphItemArg, interArg: InteractableItemArg) {
        super(ngiArg, interArg);
        this.radiusScale = .1;
    }

    _renderShape() {
        const screenD = this.displayedShape;
        const halfW = screenD.width / 2;
        const halfH = screenD.height / 2;

        const radius = Math.min(screenD.width, screenD.height);
        const shape = h("rect.node", {
            transform: `translate(-${halfW}, -${halfH})`,
            rx: `${radius * this.radiusScale}`,
            ry: `${radius * this.radiusScale}`,
        });
        this.shape = domCreateSvg(shape);
        this.g.appendChild(this.shape);
    }

    redrawSize() {
        const screenD = super.redrawSize();

        const radius = Math.min(screenD.width, screenD.height);
        this.shape.setAttribute("rx", `${radius * this.radiusScale}`);
        this.shape.setAttribute("ry", `${radius * this.radiusScale}`);

        return screenD;
    }
}

export class EnsembleView extends ResizeableView {
    aspect: number;
    radiusScale: number;

    constructor(ngiArg: NetGraphItemArg, interArg: InteractableItemArg) {
        super(ngiArg, interArg);

        // the ensemble is the only thing with aspect
        this.aspect = 1.;
        this.radiusScale = 17.8;

        // TODO: what does this do?
        interact(this.area).resizable({
            invert: "reposition",
        });
    }

    get displayedSize() {
        const hScale = this.ng.scaledWidth;
        const vScale = this.ng.scaledHeight;
        // TODO: get nested implemented
        // let w = this.nestedWidth * hScale;
        // let h = this.nestedHeight * vScale;
        let w = this.width * hScale;
        let h = this.height * vScale;

        if (h * this.aspect < w) {
            w = h * this.aspect;
        } else if (w / this.aspect < h) {
            h = w / this.aspect;
        }

        return [w / hScale, h / vScale];
    }

     /**
      * Function for drawing ensemble svg.
      */
    _renderShape() {
        const shape = h("g.ensemble");

        const dx = -1.25;
        const dy = 0.25;

        let circle: VNode;

        circle = h("circle", {cx: -11.157 + dx, cy: -7.481 + dy, r: "4.843"});
        shape.children.push(circle);
        circle = h("circle", {cx: 0.186 + dx, cy: -0.127 + dy, r: "4.843"});
        shape.children.push(circle);
        circle = h("circle", {cx: 5.012 + dx, cy: 12.56 + dy, r: "4.843"});
        shape.children.push(circle);
        circle = h("circle", {cx: 13.704 + dx, cy: -0.771 + dy, r: "4.843"});
        shape.children.push(circle);
        circle = h("circle", {cx: -10.353 + dx, cy: 8.413 + dy, r: "4.843"});
        shape.children.push(circle);
        circle = h("circle", {cx: 3.894 + dx, cy: -13.158 + dy, r: "4.843"});
        shape.children.push(circle);

        this.shape = domCreateSvg(shape);
        this.g.appendChild(this.shape);
    }

    contSize(event) {
        const scale = this.scales;
        const pos = this.screenLocation;
        const verticalResize =
            event.edges.bottom || event.edges.top;
        const horizontalResize =
            event.edges.left || event.edges.right;

        let w = pos[0] - event.clientX + this.ng.offsetX;
        let h = pos[1] - event.clientY + this.ng.offsetY;

        if (event.edges.right) {
            w *= -1;
        }
        if (event.edges.bottom) {
            h *= -1;
        }
        if (w < 0) {
            w = 1;
        }
        if (h < 0) {
            h = 1;
        }

        const screenW = this.width * scale.hor;
        const screenH = this.height * scale.vert;

        if (horizontalResize && verticalResize) {
            const p = (screenW * w + screenH * h) / Math.sqrt(
                screenW * screenW + screenH * screenH);
            const norm = Math.sqrt(
                this.aspect * this.aspect + 1);
            h = p / (this.aspect / norm);
            w = p * (this.aspect / norm);
        } else if (horizontalResize) {
            h = w / this.aspect;
        } else {
            w = h * this.aspect;
        }

        this.width = w / scale.hor;
        this.height = h / scale.vert;
    }

    redrawSize() {
        // this redraws the label
        const screenD = super.redrawSize();

        if (screenD.height * this.aspect < screenD.width) {
            screenD.width = screenD.height * this.aspect;
        } else if (screenD.width / this.aspect < screenD.height) {
            screenD.height = screenD.width / this.aspect;
        }

        const width = screenD.width;
        const height = screenD.height;
        const scale = Math.sqrt(height * height + width * width) / Math.sqrt(2);

        this.shape.setAttribute(
            "transform",
            `scale(${scale / 2 / this.radiusScale})`,
        );
        this.shape.setAttribute(
            "style",  `stroke-width ${20 / scale}`,
        );

        this.area.setAttribute(
            "width", String(width * 0.97),
        );

        return screenD;
    }
}

export class NetView extends ResizeableView {

    constructor(ngiArg: NetGraphItemArg, interArg: InteractableItemArg) {
        super(ngiArg, interArg);
    }

    _renderShape() {
        const shape = h("rect.network");
        this.shape = domCreateSvg(shape);
        this.g.appendChild(this.shape);
    }

    makeTransparent() {
        this.shape.setAttribute("style", "fill-opacity=0.0");
    }

    opacity(val: number) {
        this.shape.setAttribute("style", `fill-opacity=${val}`);
    }
}
