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

import { SimControl } from "./sim-control";
import { ModalView } from "./views/modal";
import { SimControlView } from "./views/sim-control";
import { MockConnection } from "./websocket";

// import { Editor } from "./editor";
// import { NetGraph } from "./netgraph/netgraph";
// import { SideMenu } from "./side-menu";
// import { SimControl } from "./sim-control";
// import { Toolbar } from "./toolbar";
// import { WSConnection } from "./websocket";

// TODO: put all of this in an ajax call to Python. To get:
// editor uid (uid)
// netgraph uid
// simcontrol config/args (simconfig) -- shown_time, uid, kept_time
// filename

export class NengoDebug {
    live: any[] = [];
    objects = {
        main: {
            SimControl: () => {
                const sc = new SimControl("uid", 4.0, 0.5);
                sc.attach(new MockConnection());
                return sc
            }
        },
        view: {
            ModalView: () => {
                const mv = new ModalView();
                mv.show();
                return mv;
            },
            SimControlView: () => { return new SimControlView(); },
        }
    }

    add(category: string, name: string) {
        const obj = this.objects[category][name]();
        let root: HTMLDivElement;
        if (category === "main") {
            root = obj.view.root;
        } else if (category === "view") {
            root = obj.root;
        }
        document.body.appendChild(root);
        this.live.push(obj);
        return {
            eval: (command: string) => {
                eval(command);
            },
            remove: () => {
                document.body.removeChild(root);
                this.live.splice(this.live.indexOf(obj), 1);
            },
        }
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
document.addEventListener("DOMContentLoaded", () => {
    // This is what normally happens -- for now we'll just ignore it
    // nengo.ondomload();

    // Set a function in the window for debug purposes
    (<NengoWindow> window).nengoDebug = new NengoDebug();
});


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
