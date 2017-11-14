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

import * as items from "./items";
import { DebugItem, NengoDebug, NengoWindow } from "../main";
import { Network } from "../components/network";
import { NetGraph } from "../netgraph/main";
import { MockConnection } from "../server";
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

export class Debug {
    nengoWindow: NengoWindow;
    view: DebugView = new DebugView();

    constructor() {
        this.view.iframe.addEventListener("load", () => {
            this.nengoWindow = this.view.iframe.contentWindow as NengoWindow;

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

    get nengoDebug() {
        return this.nengoWindow.nengoDebug;
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
