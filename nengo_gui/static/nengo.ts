/**
 * Entry point into the Nengo application.
 */

import "bootstrap/dist/css/bootstrap.min.css";
import "imports?$=jquery,jQuery=jquery!bootstrap";
import "imports?$=jquery,jQuery=jquery!bootstrap-validator";
import "imports?$=jquery,jQuery=jquery!jquery-ui";
import "imports?$=jquery,jQuery=jquery!jqueryfiletree/src/jQueryFileTree";
import "jqueryfiletree/dist/jQueryFileTree.min.css";

import "./favicon.ico";
import "./nengo.css";

import { Editor } from "./editor";
import { NetGraph } from "./netgraph/netgraph";
import { SideMenu } from "./side_menu";
import { SimControl } from "./sim_control";
import { Toolbar } from "./toolbar";

// TODO: put all of this in an ajax call to Python. To get:
// editor uid (uid)
// netgraph uid
// simcontrol config/args (simconfig) -- shown_time, uid, kept_time
// filename

export class Nengo {
    control;
    editor;
    hotkeys;
    main;
    modal;
    netgraph;
    sidemenu;
    sim;
    toolbar;

    constructor(simargs, filename, editoruid, netgraphargs) {
        this.main = document.getElementById("main");
        this.control = document.getElementById("control");

        this.netgraph = new NetGraph(this.main, netgraphargs);
        this.editor = new Editor(editoruid, this.netgraph);
        this.sim = new SimControl(this.control, simargs, this.editor);
        this.sidemenu = new SideMenu(this.sim);
        this.toolbar = new Toolbar(filename, this.sim);

        this.modal = this.sim.modal;
        this.hotkeys = this.modal.hotkeys;

        document.title = filename;
    }
}

$(document).ready(() => {


    body = document.getElementById("body");
    body.removeChild(document.getElementById("loading-div"));
    %(main_components)s
    nengo = new Nengo.default(simargs, filename, editoruid, netgraphargs);
    %(components)s
}

// Exposing components for server
import "expose?HTMLView!./components/htmlview";
import "expose?Image!./components/image";
import "expose?Pointer!./components/pointer";
import "expose?Raster!./components/raster";
import "expose?Slider!./components/slider";
import "expose?SpaSimilarity!./components/spa_similarity";
import "expose?Value!./components/value";
import "expose?XYValue!./components/xyvalue";
import "expose?utils!./utils";
