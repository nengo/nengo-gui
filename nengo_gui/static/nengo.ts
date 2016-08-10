// Expose jquery globally
var $ = require('expose?$!./jquery');

import "./favicon.ico";
import "bootstrap/dist/css/bootstrap.min.css";
import "jqueryfiletree/dist/jQueryFileTree.min.css";
import "./nengo.css"

import Config from "./config";
import Editor from "./editor";
import NetGraph from "./components/netgraph";
import SideMenu from "./side_menu";
import SimControl from "./sim_control";
import Toolbar from "./top_toolbar";

// TODO: put all of this in an ajax call to Python. To get:
// editor uid (uid)
// netgraph uid
// simcontrol config/args (simconfig) -- shown_time, uid, kept_time
// filename

export default class Nengo {

    constructor(simargs, filename, editoruid, netgraphargs) {
        this.main = document.getElementById('main');
        this.control = document.getElementById('control');

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
require('expose?data_to_csv!./data_to_csv');
// Exposing components for server
require('expose?HTMLView!./components/htmlview');
require('expose?Image!./components/image');
require('expose?Pointer!./components/pointer');
require('expose?Raster!./components/raster');
require('expose?Slider!./components/slider');
require('expose?SpaSimilarity!./components/spa_similarity');
require('expose?Value!./components/value');
require('expose?XYValue!./components/xyvalue');
require('expose?utils!./utils');
