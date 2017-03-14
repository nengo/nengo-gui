/**
 * Entry point into the Nengo application.
 */

import "awesomplete/awesomplete.css";
import * as Awesomplete from "awesomplete";
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

import { SimControl } from "./sim-control";
import { MockConnection } from "./websocket";

import { DebugView } from "./views/debug";
import { ModalView } from "./views/modal";
import { SimControlView } from "./views/sim-control";

if (typeof localStorage === "undefined" || localStorage === null) {
    console.error("localStorage not available. Please update your browser!");
}

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

        // Add autocomplete for the text input
        const inputHistory = new CommandHistory(label);
        const autocomplete = new Awesomplete(input, {
            list: inputHistory.history,
            minChars: 1,
            maxItems: 5,
        });

        // Eval JS when pressing enter or clicking on eval button
        const evalView = () => {
            const js: string = input.value;
            if (js !== "") {
                const out = eval(js); // tslint:disable-line
                input.value = "";
                evalOutput.textContent = out;
                inputHistory.add(js);
                console.log(inputHistory.history);
                autocomplete.list = inputHistory.history;
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
            inputHistory.save();
            this.view.debug.removeChild(root);
            this.view.removeControlGroup(controlGroupRoot);
        };
    }

    register(category: string, label: string, callback: (() => any)) {
        const clickable = this.view.register(category, label);

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
            window.dispatchEvent(new Event("resize"));
        };
    }
}

/* tslint:disable:no-console */

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
