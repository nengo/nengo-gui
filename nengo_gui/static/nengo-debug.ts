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
import * as interact from "interact.js";

import "./favicon.ico";
import "./nengo.css";

// import { Editor } from "./editor";
// import { NetGraph } from "./netgraph/netgraph";
// import { SideMenu } from "./side-menu";
import { SimControl } from "./sim-control";
// import { Toolbar } from "./toolbar";
import { Connection } from "./websocket";

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
import { SimControlView } from "./views/sim-control";
// import { first } from "./views/views";

// import * as utils from "./utils";

export class NengoDebug {
    view: DebugView = new DebugView();

    constructor() {
        document.body.appendChild(this.view.root);

        this.view.outline.onclick = () => {
            const stylesheet = document.styleSheets[0] as CSSStyleSheet;
            const rule = stylesheet.cssRules[0];
            const ruleText = ".debug * { outline: red solid 1px; }";
            const active = rule.cssText === ruleText;

            if (active) {
                stylesheet.deleteRule(0);
            } else {
                stylesheet.insertRule(ruleText, 0);
            }
        };
        this.view.log.onclick = () => {
            MockConnection.verbose = !MockConnection.verbose;
        };
    }

    attachControlGroup(obj: any, root: HTMLDivElement, label: string) {
        const {
            controlGroupRoot,
            evalBtn,
            evalOutput,
            input,
            remove,
        } = this.view.addControlGroup(label);
        const evalView = () => {
            const js: string = input.value;
            if (js !== "") {
                const out = eval(js); // tslint:disable-line
                input.value = "";
                evalOutput.textContent = out;
            }
        };
        evalBtn.onclick = () => {
            evalView();
        };

        // TODO: hijack console.log
        // stackoverflow.com/questions/11403107/

        input.onkeypress = event => {
            if (event.key.toLowerCase() === "enter") {
                evalView();
                return false;
            }
        };
        remove.onclick = event => {
            this.view.debug.removeChild(root);
            this.view.removeControlGroup(controlGroupRoot);
        };
    }

    register(category: string, label: string, callback: (() => any)) {
        let clickable;
        clickable = this.view.register(category, label);

        clickable.onclick = () => {
            const obj = callback();
            let root: HTMLDivElement;
            if (category === "main") {
                root = obj.view.root;
            } else if (category === "view") {
                root = obj.root;
            }
            this.view.debug.appendChild(root);
            this.attachControlGroup(obj, root, label);
        };
    }
}

/* tslint:disable:no-console */

class MockConnection implements Connection {
    static verbose: boolean = true;

    typename: string = "mock";
    uid: string = "mock";

    bind(name: string, callback: (kwargs: any) => any): MockConnection {
        if (MockConnection.verbose) {
            console.log("binding " + name);
        }
        return this;
    }

    dispatch(name: string, kwargs: any = {}): MockConnection {
        if (MockConnection.verbose) {
            console.log("dispatch " + name + "(" + Object.keys(kwargs) + ")");
        }
        return this;
    }

    send(name: string, kwargs: any = {}): MockConnection {
        if (MockConnection.verbose) {
            console.log("send " + name + "(" + Object.keys(kwargs) + ")");
        }
        return this;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const nengo = new NengoDebug();
    nengo.register("view", "SimControlView", () => {
        return new SimControlView();
    });
    nengo.register("main", "SimControl", () => {
        const simcontrol = new SimControl("uid", 4.0, 0.5);
        // Monkey patches for debugging
        simcontrol.attach(new MockConnection());
        return simcontrol;
    });
});
