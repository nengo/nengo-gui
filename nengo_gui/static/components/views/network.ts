import { VNode, dom, h } from "maquette";

import { ResizableComponentView } from "./base";
import * as utils from "../../utils"

import "./network.css";

export class NetworkView extends ResizableComponentView {
    rect: SVGRectElement;

    constructor(label: string) {
        super(label);
        const node = h("g.network", [
            h("rect", {
                height: "50",
                styles: {
                    "fill": "rgb(0,0,0)",
                    "fill-opacity": "1.0",
                    "stroke": "rgb(0,0,0)",
                },
                width: "50",
                x: "0",
                y: "0",
            })
        ]);
        this.body = utils.domCreateSVG(node) as SVGGElement;
        this.root.appendChild(this.body);
        this.rect = this.body.firstChild as SVGRectElement;
    }

    get fill(): string {
        return this.rect.style.fill;
    }

    set fill(val: string) {
        this.rect.style.fill = val;
    }

    get scale(): [number, number] {
        return [
            Number(this.rect.getAttribute("width")),
            Number(this.rect.getAttribute("height")),
        ];
    }

    set scale(val: [number, number]) {
        const width = Math.max(ResizableComponentView.minWidth, val[0]);
        const height = Math.max(ResizableComponentView.minHeight, val[1]);
        this.rect.setAttribute("width", `${width}`);
        this.rect.setAttribute("height", `${height}`);
        this.overlayScale = [width, height];
    }

    get stroke(): string {
        return this.rect.style.stroke;
    }

    set stroke(val: string) {
        this.rect.style.stroke = val;
    }

    get transparent(): boolean {
        return this.rect.style.fillOpacity === "0";
    }

    set transparent(val: boolean) {
        if (val) {
            this.rect.style.fillOpacity = "0";
        } else {
            this.rect.style.fillOpacity = "1";
        }
    }
}
