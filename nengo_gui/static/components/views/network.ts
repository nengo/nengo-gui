import { VNode, dom, h } from "maquette";

import { ModelObjView } from "./base";
import * as utils from "../../utils"

export class NetworkView extends ModelObjView {

    shapeNode(): VNode {
        return h("rect.network", {
            styles: {
                "fill": "rgb(0,0,0)",
                "fill-opacity": "1.0",
                "stroke": "rgb(0,0,0)",
            },
            transform: "scale(1,1)",
        });
    }

    get fill(): string {
        return this.shape.style.fill;
    }

    set fill(val: string) {
        this.shape.style.fill = val;
    }

    get stroke(): string {
        return this.shape.style.stroke;
    }

    set stroke(val: string) {
        this.shape.style.stroke = val;
    }

    get transparent(): boolean {
        return this.shape.style.fillOpacity === "0";
    }

    set transparent(val: boolean) {
        if (val) {
            this.shape.style.fillOpacity = "0";
        } else {
            this.shape.style.fillOpacity = "1";
        }
    }
}
