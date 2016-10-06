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
            MockWebSocket.verbose = !MockWebSocket.verbose;
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

class MockWebSocket implements WebSocket {
    static verbose: boolean = true;

    binaryType: string = "blob";
    bufferedAmount: number = 0;
    extensions: string = "";
    protocols: any;
    onclose: any = null;
    onerror: any = null;
    onmessage: any = null;
    onopen: any = null;
    protocol: string = "";
    readyState: number = WebSocket.OPEN;
    url: string;

    CLOSED = WebSocket.CLOSED;
    CLOSING = WebSocket.CLOSING;
    CONNECTING = WebSocket.CONNECTING;
    OPEN = WebSocket.OPEN;

    constructor(url: string, protocols: any = null) {
        this.url = url;
        this.protocols = protocols;

        if (MockWebSocket.verbose) {
            console.log("ws: Made WebSocket to " + this.url);
            if (protocols !== null) {
                console.log("ws: protocols = " + this.protocols);
            }
        }
    }

    addEventListener() {
        // This method left intentionally blank.
    }
    removeEventListener() {
        // This method left intentionally blank.
    }
    dispatchEvent() {
        return false;
    }

    close(code: number = null, reason: string = null) {
        if (MockWebSocket.verbose) {
            console.log(
                "ws: closing (code=" + code + ", reason=" + reason + ")"
            );
        }
    }

    send(message: string) {
        if (MockWebSocket.verbose) {
            console.log("ws: sending '" + message + "'");
        }
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
        simcontrol.ws = new MockWebSocket(simcontrol.ws.url);
        interact(".shown-time")
            .draggable({
                onmove: event => {
                    console.log("here");
                },
            })
            .resizable({
                edges: {bottom: false, left: true, right: true, top: false},
            })
            .on("resizemove", event => {
                console.log("Here");
            });
        return simcontrol;
    });
});
