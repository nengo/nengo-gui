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

import * as items from "./debug/items";

import { Network } from "./components/network";
import { NetGraph } from "./netgraph";
import { MockConnection } from "./websocket";

// TODO: put all of this in an ajax call to Python. To get:
// editor uid (uid)
// netgraph uid
// simcontrol config/args (simconfig) -- shown_time, uid, kept_time
// filename

export class DebugItem {
    category: string;
    name: string;
    obj: any;
    root: HTMLDivElement;

    constructor(category: string, name: string) {
        this.category = category;
        this.name = name;
        this.obj = items[category][name]();

        if ("view" in this.obj) {
            this.root = this.obj.view.root;
        } else if ("root" in this.obj) {
            this.root = this.obj.root;
        } else {
            console.error("Cannot find root.");
        }
    }

    eval(command: string) {
        const obj = this.obj;
        const retval = eval(command);
        if (retval) {
            console.log(retval);
        }
        return retval;
    }

}

export class NengoDebug {
    items: Array<DebugItem> = [];
    netgraph: NetGraph = new NetGraph("debug");

    constructor() {
        this.netgraph.attach(new MockConnection());
        this.netgraph.view.root.style.outline = "red solid 1px";
        document.body.appendChild(this.netgraph.view.root);
    }

    add(category: string, name: string) {
        const item = new DebugItem(category, name);
        if (item.category === "componentview") {
            this.netgraph.view.root.appendChild(item.root);
            if ("ondomadd" in item.obj) {
                item.obj.ondomadd();
            }
        } else if (item.category === "component") {
            // Add the item to the last added network.
            let network = null;
            this.netgraph.components.components.forEach(component => {
                if (component instanceof Network) {
                    network = component;
                }
            });
            this.netgraph.add(item.obj, network);
        } else {
            document.body.appendChild(item.root);
        }
        this.items.push(item);
        return item;
    }

    remove(item: DebugItem) {
        if (item.category === "componentview") {
            this.netgraph.view.root.removeChild(item.root);
        } else if (item.category === "component") {
            this.netgraph.remove(item.obj);
        } else {
            document.body.removeChild(item.root);
        }
        // Bootstrap modals can leave behind a backdrop. Annoying!
        const backdrop = document.body.querySelector(".modal-backdrop");
        if (backdrop !== null) {
            document.body.classList.remove("modal-open");
            document.body.removeChild(backdrop);
        }
        this.items.splice(this.items.indexOf(item), 1);
    }

    toggleLog() {
        MockConnection.verbose = !MockConnection.verbose;
    }

    toggleOutline() {
        const stylesheet = document.styleSheets[0] as CSSStyleSheet;
        const rule = stylesheet.cssRules[0];
        const ruleText = "* { outline: red solid 1px; }";
        const active = rule.cssText === ruleText;

        if (active) {
            stylesheet.deleteRule(0);
        } else {
            stylesheet.insertRule(ruleText, 0);
        }
    }
}

// export class Nengo {
//     control;
//     editor;
//     filename: string;
//     hotkeys;
//     main;
//     modal;
//     netgraph;
//     sidemenu;
//     sim;
//     toolbar;
//     private ws: WSConnection;

//     constructor(simargs, filename, editoruid, netgraphargs) {
//         this.filename = filename;

//         this.main = document.getElementById("main");
//         this.control = document.getElementById("control");
//         this.ws = new WSConnection("main");

//         this.netgraph = new NetGraph("uid");
//         this.editor = new Editor(editoruid, this.netgraph);
//         this.sim = new SimControl("uid", 4.0, 0.5);
//         this.sim.attach(this.ws);
//         this.sidemenu = new SideMenu(this.sim);
//         this.toolbar = new Toolbar(filename, this.sim);

//         this.modal = this.sim.modal;
//         this.hotkeys = this.modal.hotkeys;

//     }

//     ondomload() {
//         document.title = this.filename;

//         document.body.appendChild(this.sim.view.root);

//         // In case anything needs to be adjusted
//         window.dispatchEvent(new Event("resize"));

//         // body = document.getElementById("body");
//         // body.removeChild(document.getElementById("loading-div"));
//         // %(main_components)s
//         // nengo = new Nengo.default(simargs, filename, editoruid, netgraphargs);
//         // %(components)s
//     }
// }

export interface NengoWindow extends Window {
    nengoDebug: NengoDebug;
}

// Most initialization can be done before DOM content is loaded
// const nengo = new Nengo(null, null, null, null);
if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
        // This is what normally happens -- for now we'll just ignore it
        // nengo.ondomload();

        // Set a function in the window for debug purposes
        (<NengoWindow> window).nengoDebug = new NengoDebug();
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
