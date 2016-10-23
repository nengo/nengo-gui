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

import { SimControl } from "./sim-control";
import { MockConnection } from "./websocket";

import { DebugView } from "./views/debug";
import { SimControlView } from "./views/sim-control";

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
