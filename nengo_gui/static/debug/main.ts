/**
 * Entry point into the Nengo debug application.
 */

import "awesomplete/awesomplete.css";
import * as Awesomplete from "awesomplete";
import "bootstrap/dist/css/bootstrap.min.css";
import "imports-loader?$=jquery,jQuery=jquery!bootstrap";
import "imports-loader?$=jquery,jQuery=jquery!bootstrap-validator";
import "imports-loader?$=jquery,jQuery=jquery!jquery-ui";
import "imports-loader?$=jquery,jQuery=jquery!jqueryfiletree/src/jQueryFileTree";

import "../favicon.ico";

import { NengoWindow } from "../main";
import { Network } from "../components/network";
import { NetGraph } from "../netgraph";
import { MockConnection } from "../websocket";
import * as items from "./items";
import { DebugView } from "./view";

export class CommandHistory {
    history: string[];
    label: string;
    toSave = 0;
    static autoSaveThreshold = 1;
    static keyPrefix = "ngdebug.history";

    constructor(label: string) {
        this.label = label;
        const fromStorage = localStorage.getItem(this.key);
        if (fromStorage === null) {
            this.history = [];
        } else {
            this.history = JSON.parse(fromStorage);
        }
    }

    get key(): string {
        return CommandHistory.keyPrefix + "." + this.label;
    }

    add(command: string) {
        if (this.history.indexOf(command) < 0) {
            this.history.push(command);
            this.toSave += 1;
        }
        // We expect that save will be called manually, but just in case,
        // we autosave once we have a certain number of new commands.
        if (this.toSave > CommandHistory.autoSaveThreshold) {
            this.save();
        }
    }

    save() {
        localStorage.setItem(this.key, JSON.stringify(this.history));
        this.toSave = 0;
    }
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

export class Debug {
    nengoDebug: NengoDebug;
    nengoWindow: NengoWindow;
    view: DebugView = new DebugView();

    constructor() {
        this.view.iframe.addEventListener("load", () => {
            this.nengoWindow = this.view.iframe.contentWindow as NengoWindow;
            this.nengoDebug = this.nengoWindow.nengoDebug;

            this.view.outline.onclick = () => {
                this.nengoDebug.toggleOutline();
            };
            this.view.log.onclick = () => {
                this.nengoDebug.toggleLog();
            };

            const attach = (category: string) => {
                const obj = items[category];
                Object.keys(obj).forEach(label => {
                    const clickable = this.view.register(category, label);

                    clickable.onclick = () => {
                        const item = this.nengoDebug.add(category, label);
                        this.attachControlGroup(item);
                        this.nengoWindow.dispatchEvent(new Event("resize"));
                    };
                });
            };
            attach("main");
            attach("view");
            attach("component");
            attach("componentview");
        });
    }

    attachControlGroup(item: DebugItem) {
        const group = this.view.addControlGroup(item.name);
        if (item.category === "component") {
            const connectButton = group.addConnectButton();
            connectButton.addEventListener("click", event => {
                const ng = this.nengoDebug.netgraph;
                const randomObj =
                    ng.components.components[
                        Math.floor(Math.random() * ng.components.length)
                    ];
                console.log(`Connecting to ${randomObj.uid}`);
                ng.connect(item.obj, randomObj);
            });
        }

        // Add autocomplete for the text input
        const inputHistory = new CommandHistory(item.name);
        const autocomplete = new Awesomplete(group.input, {
            list: inputHistory.history,
            minChars: 1,
            maxItems: 4
        });
        Object.getOwnPropertyNames(item.obj).forEach(key => {
            inputHistory.add("obj." + key);
        });

        // Eval JS when pressing enter or clicking on eval button
        const evalView = () => {
            const js: string = group.input.value;
            if (js !== "") {
                const out = item.eval(js);
                group.input.value = "";
                group.evalOutput.textContent = out;
                inputHistory.add(js);
                autocomplete.list = inputHistory.history;
            }
        };
        group.evalButton.addEventListener("click", () => {
            evalView();
        });

        // TODO: hijack console.log
        // stackoverflow.com/questions/11403107/

        group.input.addEventListener("keypress", event => {
            if (event.key.toLowerCase() === "enter") {
                evalView();
                return false;
            }
        });
        group.removeButton.addEventListener("click", event => {
            inputHistory.save();
            this.nengoDebug.remove(item);
            this.view.removeControlGroup(group);
        });
    }
}

if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
        const debug = new Debug();
        document.body.appendChild(debug.view.root);
    });
}

// TODO

// import { NetGraph } from "./netgraph";

// /* tslint:disable:no-console */
// document.addEventListener("DOMContentLoaded", () => {
//     const netg = new NetGraph("test");
//     document.body.appendChild(netg.view.root);
//     netg.view.onResize(null);
//     console.assert(netg.view.width !== 0);
//     console.assert(netg.view.height !== 0);
//     netg.createNode(
//         {ng: netg, width: 0.2, height: 0.2, posX: 0.5, posY: 0.5,
//             parent: null, uid: "node2"},
//         {miniItem: 1, label: "test_node"}, 1, null);
//     console.log("stuff is loaded");
// });

// obj.createNode({ng: obj, width: 0.2, height: 0.2, posX: 0.5, posY: 0.5, parent: null, uid: "node2"}, {miniItem: 1, label: "test_node"}, 1, null);
