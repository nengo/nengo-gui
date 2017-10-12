/**
 * Entry point into the Nengo application.
 */

import "bootstrap/dist/css/bootstrap.min.css";
import "imports-loader?$=jquery,jQuery=jquery!bootstrap";
import "imports-loader?$=jquery,jQuery=jquery!bootstrap-validator";
import "imports-loader?$=jquery,jQuery=jquery!jquery-ui";
import "imports-loader?$=jquery,jQuery=jquery!jqueryfiletree/src/jQueryFileTree";
import "jqueryfiletree/dist/jQueryFileTree.min.css";

import "./favicon.ico";
import "./nengo.css";

import { NengoDebug } from "./debug/main";

export interface NengoWindow extends Window {
    nengo: Nengo;
    nengoDebug: NengoDebug;
}


export class Nengo {
    control;
    editor;
    filename: string;
    hotkeys;
    main;
    modal;
    netgraph;
    sidemenu;
    sim;
    toolbar;
    // private ws: WSConnection;

    constructor() {

        document.title = this.filename;

        document.body.appendChild(this.sim.view.root);

        // In case anything needs to be adjusted
        window.dispatchEvent(new Event("resize"));

        // body = document.getElementById("body");
        // body.removeChild(document.getElementById("loading-div"));
        // %(main_components)s
        // nengo = new Nengo.default(simargs, filename, editoruid, netgraphargs);
        // %(components)s

        this.filename = filename;

        // this.main = document.getElementById("main");
        // this.control = document.getElementById("control");
        // this.ws = new WSConnection("main");

        // this.netgraph = new NetGraph("uid");
        // this.editor = new Editor(editoruid, this.netgraph);
        // this.sim = new SimControl("uid", 4.0, 0.5);
        // this.sim.attach(this.ws);
        // this.sidemenu = new SideMenu(this.sim);
        // this.toolbar = new Toolbar(filename, this.sim);

        // this.modal = this.sim.modal;
        // this.hotkeys = this.modal.hotkeys;
    }
}

if (typeof localStorage === "undefined" || localStorage === null) {
    console.error("localStorage not available. Please update your browser!");
}

if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
        (<NengoWindow>window).nengo = new Nengo();

        // Set a function in the window for debug purposes
        (<NengoWindow>window).nengoDebug = new NengoDebug();
    });
}

// Exposing components for server
// import "expose-loader?HTMLView!./components/htmlview";
// import "expose-loader?Image!./components/image";
// import "expose-loader?Pointer!./components/pointer";
// import "expose-loader?Raster!./components/raster";
// import "expose-loader?Slider!./components/slider";
// import "expose-loader?SpaSimilarity!./components/spa-similarity";
// import "expose-loader?Value!./components/value";
// import "expose-loader?XYValue!./components/xyvalue";
// import "expose-loader?utils!./utils";
