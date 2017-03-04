import "./netgraph.css";
import { dom, h  } from "maquette";

export class NetGraphView {
    gConns: SVGElement;
    gItems: SVGElement;
    gNetworks: SVGElement;
    height: number;
    root: HTMLElement;
    uid: string;
    width: number;

    constructor(uid: string) {
        this.uid = uid;

        // Reading netgraph.css file as text and embedding it within def tags;
        // this is needed for saving the SVG plot to disk.
        const css = require("!!css-loader!./netgraph.css").toString();

        const defs = h("defs", [h(
            "style", {type: "text/css"}, ["<![CDATA[\n" + css + "\n]]>"]
        )]);


        // Create the master SVG element
        const svg = h("svg.netgraph#netgraph", {
            styles: {height: "100%", position: "absolute", width: "100%"},
            onresize: event => {
                this.onResize(event);
            },
        }, [
            defs,
            h("g#netRoot"),
            h("g#connRoot"),
            h("g#itemRoot"),
        ]);

        this.root = dom.create(svg).domNode as HTMLElement;

        // Three separate layers, so that expanded networks are at the back,
        // then connection lines, and then other items (nodes, ensembles, and
        // collapsed networks) are drawn on top.

        this.gNetworks = this.root.querySelector("#netRoot") as SVGElement;
        this.gConns = this.root.querySelector("#connRoot") as SVGElement;
        this.gItems = this.root.querySelector("#itemRoot") as SVGElement;

        this.width = this.root.getBoundingClientRect().width;
        this.height = this.root.getBoundingClientRect().height;

        // Respond to resize events
        window.addEventListener("resize", event => {
            this.onResize(event);
        });
    }

     /**
      * Handler for resizing the full SVG.
      */
    onResize(event) {
        this.width = this.root.getBoundingClientRect().width;
        this.height = this.root.getBoundingClientRect().height;

        // Should also call the netgraph resize? Is this an anti-pattern?
    }
}
