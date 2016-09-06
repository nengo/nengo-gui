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

import NetGraph from "./components/netgraph";
import Config from "./config";
import Editor from "./editor";
import SideMenu from "./side_menu";
import SimControl from "./sim_control";
import Toolbar from "./top_toolbar";

// TODO: put all of this in an ajax call to Python. To get:
// editor uid (uid)
// netgraph uid
// simcontrol config/args (simconfig) -- shown_time, uid, kept_time
// filename

export default class Nengo {
    config;
    control;
    editor;
    hotkeys;
    main;
    modal;
    netgraph;
    sidemenu;
    sim;
    toolbar;
    viewport;

    constructor(simargs, filename, editoruid, netgraphargs) {
        this.main = document.getElementById("main");
        this.control = document.getElementById("control");

        this.config = new Config();

        this.netgraph = new NetGraph(this.main, this.config, netgraphargs);
        this.editor = new Editor(editoruid, this.netgraph);
        this.sim = new SimControl(this.control, simargs, this.editor);
        this.sidemenu = new SideMenu(this.sim);
        this.toolbar = new Toolbar(filename, this.sim);

        this.modal = this.sim.modal;
        this.hotkeys = this.modal.hotkeys;
        this.viewport = this.netgraph.viewport;

        document.title = filename;
    }

}

// Exposing data_to_csv for testing
import "expose?data_to_csv!./data_to_csv";

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
