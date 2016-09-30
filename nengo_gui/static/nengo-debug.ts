/**
 * Entry point into the Nengo application.
 */

import "bootstrap/dist/css/bootstrap.min.css";
import "imports?$=jquery,jQuery=jquery!bootstrap";
import "imports?$=jquery,jQuery=jquery!bootstrap-validator";
import "imports?$=jquery,jQuery=jquery!jquery-ui";
import "imports?$=jquery,jQuery=jquery!jqueryfiletree/src/jQueryFileTree";
import "jqueryfiletree/dist/jQueryFileTree.min.css";
import * as d3 from "d3";

import "./favicon.ico";
import "./nengo.css";

// import { Editor } from "./editor";
// import { NetGraph } from "./netgraph/netgraph";
// import { SideMenu } from "./side-menu";
// import { SimControl } from "./sim-control";
// import { Toolbar } from "./toolbar";

// TODO: put all of this in an ajax call to Python. To get:
// editor uid (uid)
// netgraph uid
// simcontrol config/args (simconfig) -- shownTime, uid, keptTime
// filename

// export class Nengo {
//     control;
//     editor;
//     hotkeys;
//     main;
//     modal;
//     netgraph;
//     sidemenu;
//     sim;
//     toolbar;

//     constructor(simargs, filename, editoruid, netgraphargs) {
//         this.main = document.getElementById("main");
//         this.control = document.getElementById("control");

//         this.netgraph = new NetGraph(this.main, netgraphargs);
//         this.editor = new Editor(editoruid, this.netgraph);
//         this.sim = new SimControl(this.control, simargs, this.editor);
//         this.sidemenu = new SideMenu(this.sim);
//         this.toolbar = new Toolbar(filename, this.sim);

//         this.modal = this.sim.modal;
//         this.hotkeys = this.modal.hotkeys;

//         document.title = filename;
//     }
// }

// $(document).ready(() => {
//     body = document.getElementById("body");
//     body.removeChild(document.getElementById("loading-div"));
//     %(main_components)s
//     nengo = new Nengo.default(simargs, filename, editoruid, netgraphargs);
//     %(components)s
// }

// Exposing components for server
// import "expose?HTMLView!./components/htmlview";
// import "expose?Image!./components/image";
// import "expose?Pointer!./components/pointer";
// import "expose?Raster!./components/raster";
// import "expose?Slider!./components/slider";
// import "expose?SpaSimilarity!./components/spa-similarity";
// import "expose?Value!./components/value";
// import "expose?XYValue!./components/xyvalue";
// import "expose?utils!./utils";

import { DebugView } from "./views/debug";
import { SimControlView } from "./views/sim-control.ts";
// import { first } from "./views/views";

export class NengoDebug {
    view: DebugView = new DebugView();

    constructor() {
        document.body.appendChild(this.view.root);
        document.body.appendChild(this.view.controls);
    }

    addView(view: any, id: string, label: string) {
        this.view.addView(id, label);
        const anchor = document.getElementById(id);
        anchor.onclick = () => {
            this.view.root.appendChild(view.root);
            view.redraw();
            this.view.showConsole();

            const evalView = () => {
                const js: string = this.view.evalInput.value;
                if (js !== "") {
                    eval(js); // tslint:disable-line
                    this.view.evalInput.value = "";
                }
            };
            this.view.evalButton.onclick = () => {
                evalView();
            };
            this.view.evalInput.onkeypress = event => {
                if (event.key.toLowerCase() === "enter") {
                    evalView();
                    return false;
                }
            };
        };
    }
}

$(document).ready(() => {
    const nengo = new NengoDebug();
    nengo.addView(new SimControlView(), "sim-control", "SimControl");
});
