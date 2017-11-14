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

import * as items from "./debug/items";
import { Editor } from "./editor";
import { HotkeyManager } from "./hotkeys";
import { NetGraph } from "./netgraph/main";
import { MockConnection, ServerConnection } from "./server";
import { Sidebar } from "./sidebar";
import { SimControl } from "./sim-control";
import { Toolbar } from "./toolbar";
import { Network } from "./components/network";
import { MainView } from "./views/main";

export interface NengoWindow extends Window {
    nengo: Nengo;
    nengoDebug: NengoDebug;
}

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
    netgraph: NetGraph = new NetGraph(new MockConnection());

    constructor() {
        this.netgraph.view.root.style.width = "600px";
        this.netgraph.view.root.style.height = "600px";
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

export class Nengo {
    control;
    editor;
    filename: string;
    hotkeys;
    main;
    modal;
    netgraph;
    sidebar;
    sim;
    toolbar;

    private server: ServerConnection;
    private view: MainView = new MainView();

    constructor(server: ServerConnection) {
        this.editor = new Editor(server);
        this.sim = new SimControl(server);
        this.toolbar = new Toolbar(server);
        this.sidebar = new Sidebar(server);
        this.netgraph = new NetGraph(server);

        // Add hotkeys
        this.hotkeys = new HotkeyManager(server);
        this.sim.hotkeys(this.hotkeys);
        this.netgraph.hotkeys(this.hotkeys);
        this.editor.hotkeys(this.hotkeys);

        document.body.appendChild(this.toolbar.view.root);
        document.body.appendChild(this.view.root);
        document.body.appendChild(this.sim.view.root);
        this.view.root.appendChild(this.editor.view.root);
        this.view.root.appendChild(this.netgraph.view.root);
        this.view.root.appendChild(this.sidebar.view.root);
        window.dispatchEvent(new Event("resize"));

        server.bind("netgraph.update", (cfg) => {
            // TODO
            // this.filename = filename;
            // this.toolbar.filename = filename
            // document.title = this.filename;
            // document.body.appendChild(this.sim.view.root);

            // In case anything needs to be adjusted
            window.dispatchEvent(new Event("resize"));
        })

        // Request config and update accordingly
        server.send("netgraph.request_update", { initialize: true })
        this.server = server;
    }
}

if (typeof localStorage === "undefined" || localStorage === null) {
    console.error("localStorage not available. Please update your browser!");
}

if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
        // Attempt to make a connection with the server
        const server = new ServerConnection();
        server.bind("open", () => {
            console.log("Server connection opened successfully");
            (<NengoWindow>window).nengo = new Nengo(server);
            server.send("page.ready");
        });
        setTimeout(() => {
            if (!server.isReady()) {
                server.close();
                console.log("Server connection timeout, entering debug mode");
                (<NengoWindow>window).nengoDebug = new NengoDebug();
            }
        }, 1000); // Time out after 1 second
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
