import { VNode, dom, h } from "maquette";

import { ModelObjView } from "./base";
import * as utils from "../../utils"

export class EnsembleView extends ModelObjView {
    aspect: number = 1.;
    radiusScale: number = 17.8;

    shapeNode(): VNode {
        // const dx = -1.25;
        // const dy = 0.25;
        const r = "4.843";

        return h("g.ensemble", {transform: "scale(1,1)"}, [
            h("circle", {cx: r, cy: "10.52", r: r}),
            h("circle", {cx: "16.186", cy: "17.874", r: r}),
            h("circle", {cx: "21.012", cy: "30.561", r: r}),
            h("circle", {cx: "29.704", cy: "17.23", r: r}),
            h("circle", {cx: "5.647", cy: "26.414", r: r}),
            h("circle", {cx: "19.894", cy: r, r: r}),
        ]);
    }

    // get displayedSize() {
    //     const hScale = this.ng.scaledWidth;
    //     const vScale = this.ng.scaledHeight;
    //     // TODO: get nested implemented
    //     // let w = this.nestedWidth * hScale;
    //     // let h = this.nestedHeight * vScale;
    //     let w = this.width * hScale;
    //     let h = this.height * vScale;

    //     if (h * this.aspect < w) {
    //         w = h * this.aspect;
    //     } else if (w / this.aspect < h) {
    //         h = w / this.aspect;
    //     }

    //     return [w / hScale, h / vScale];
    // }

    // contSize(event) {
    //     const scale = this.scales;
    //     const pos = this.screenLocation;
    //     const verticalResize =
    //         event.edges.bottom || event.edges.top;
    //     const horizontalResize =
    //         event.edges.left || event.edges.right;

    //     let w = pos[0] - event.clientX + this.ng.offsetX;
    //     let h = pos[1] - event.clientY + this.ng.offsetY;

    //     if (event.edges.right) {
    //         w *= -1;
    //     }
    //     if (event.edges.bottom) {
    //         h *= -1;
    //     }
    //     if (w < 0) {
    //         w = 1;
    //     }
    //     if (h < 0) {
    //         h = 1;
    //     }

    //     const screenW = this.width * scale.hor;
    //     const screenH = this.height * scale.vert;

    //     if (horizontalResize && verticalResize) {
    //         const p = (screenW * w + screenH * h) / Math.sqrt(
    //             screenW * screenW + screenH * screenH);
    //         const norm = Math.sqrt(
    //             this.aspect * this.aspect + 1);
    //         h = p / (this.aspect / norm);
    //         w = p * (this.aspect / norm);
    //     } else if (horizontalResize) {
    //         h = w / this.aspect;
    //     } else {
    //         w = h * this.aspect;
    //     }

    //     this.width = w / scale.hor;
    //     this.height = h / scale.vert;
    // }

    // redrawSize() {
    //     // this redraws the label
    //     const screenD = super.redrawSize();

    //     if (screenD.height * this.aspect < screenD.width) {
    //         screenD.width = screenD.height * this.aspect;
    //     } else if (screenD.width / this.aspect < screenD.height) {
    //         screenD.height = screenD.width / this.aspect;
    //     }

    //     const width = screenD.width;
    //     const height = screenD.height;
    //     const scale = Math.sqrt(height * height + width * width) / Math.sqrt(2);

    //     this.shape.setAttribute(
    //         "transform",
    //         `scale(${scale / 2 / this.radiusScale})`,
    //     );
    //     this.shape.setAttribute(
    //         "style",  `stroke-width ${20 / scale}`,
    //     );

    //     this.area.setAttribute(
    //         "width", String(width * 0.97),
    //     );

    //     return screenD;
    // }
}
