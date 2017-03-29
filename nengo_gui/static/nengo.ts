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

import { ConfigDialog, configItems } from "./config";
import { Editor } from "./editor";
import { HotkeyManager } from "./hotkeys";
import { Menu } from "./menu";
import { SimControl } from "./sim-control";
import { Toolbar } from "./toolbar";
import { ConfigDialogView } from "./views/config";
import { EditorView } from "./views/editor";
import { HotkeysDialogView } from "./views/hotkeys";
import { MenuView } from "./views/menu";
import { AlertDialogView, InputDialogView, ModalView } from "./views/modal";
import { SimControlView } from "./views/sim-control";
import { ToolbarView } from "./views/toolbar";
import { MockConnection } from "./websocket";

// import { Editor } from "./editor";
// import { NetGraph } from "./netgraph/netgraph";
// import { SideMenu } from "./side-menu";
// import { SimControl } from "./sim-control";
// import { WSConnection } from "./websocket";

// TODO: put all of this in an ajax call to Python. To get:
// editor uid (uid)
// netgraph uid
// simcontrol config/args (simconfig) -- shown_time, uid, kept_time
// filename

export class NengoDebug {
    listeners = {
        ConfigDialog: null,
    }
    live: any[] = [];
    objects = {
        main: {
            ConfigDialog: () => {
                const cd = new ConfigDialog();
                if (this.listeners.ConfigDialog === null) {
                    this.listeners.ConfigDialog = (e: CustomEvent) => {
                        console.log(e.detail + " changed");
                    };
                    document.addEventListener(
                        "nengoConfigChange", this.listeners.ConfigDialog
                    );
                }
                cd.show();
                return cd;
            },
            Editor: () => {
                return new Editor(null);
            },
            Menu: () => {
                const menu = new Menu(document.body);
                menu.addAction("Action 1.1", () => console.log("Action 1.1"));
                menu.addHeader("Hidden");
                menu.addAction("Hidden", () => false, () => false);
                menu.addSeparator();
                menu.addAction("Action 2.1", () => console.log("Action 2.1"));
                menu.show(0, 0);
                return menu;
            },
            SimControl: () => {
                const sc = new SimControl("uid", 4.0, 0.5);
                sc.attach(new MockConnection());
                return sc
            },
            Toolbar: () => {
                return new Toolbar("test.py");
            },
        },
        view: {
            AlertDialogView: () => {
                const a = new AlertDialogView("Test text");
                a.show();
                return a;
            },
            ConfigDialogView: () => {
                const cd = new ConfigDialogView(configItems);
                cd.show();
                return cd;
            },
            EditorView: () => {
                return new EditorView();
            },
            HotkeysDialogView: () => {
                const m = new HotkeyManager();
                m.add("Test ctrl", "a", {ctrl: true}, () => {});
                m.add("Test shift", "b", {shift: true}, () => {});
                m.add("Test both", "c", {ctrl: true, shift: true}, () => {});
                const hk = new HotkeysDialogView(m);
                hk.show();
                return hk;
            },
            InputDialogView: () => {
                const i = new InputDialogView("0.5", "Test label");
                i.show();
                return i;
            },
            MenuView: () => {
                const menu = new MenuView();
                menu.addAction("Action 1");
                menu.addHeader("Subactions");
                menu.addAction("Action 1.1");
                menu.addAction("Action 1.2");
                menu.addSeparator();
                menu.addAction("Action 2.1");
                return menu;
            },
            ModalView: () => {
                const mv = new ModalView();
                mv.show();
                return mv;
            },
            SimControlView: () => new SimControlView(),
            ToolbarView: () => new ToolbarView(),
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
            obj: obj,
            remove: () => {
                document.body.removeChild(root);
                // Bootstrap modals can leave behind a backdrop. Annoying!
                const backdrop = document.body.querySelector(".modal-backdrop");
                if (backdrop !== null) {
                    document.body.classList.remove("modal-open");
                    document.body.removeChild(backdrop);
                }
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
