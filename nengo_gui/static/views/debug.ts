import { dom, h } from "maquette";

import "./debug.css";
// import { first, setTransform } from "./views";

export class DebugView {
    evalButton: HTMLElement;
    evalInput: HTMLInputElement;
    console: Element;
    controls: Element;
    root: Element;
    private consoleShown: boolean = false;
    private controlsRow: Element;
    private viewMenu: Element;

    constructor() {
        const rootNode = h("div.debug");
        this.root = dom.create(rootNode).domNode;

        const controlsNode =
            h("div.debug-controls.container-fluid", [
                h("div.row", [
                    h("div.col-sm-1", [
                        h("div.dropup", [
                            h("button.btn.btn-default.dropdown-toggle#view", {
                                "aria-expanded": "false",
                                "aria-haspopup": "true",
                                "data-toggle": "dropdown",
                                "type": "button",
                            }, ["Add view", h("span.caret")]),
                            h("ul.dropdown-menu", {"aria-labelledby": "view"}),
                        ]),
                    ]),
                ]),
            ]);
        this.controls = dom.create(controlsNode).domNode;
        this.controlsRow = this.controls.querySelector(".row");
        this.viewMenu = this.controls.querySelector(".dropdown-menu");

        const consoleNode =
            h("div.console.col-sm-3", [
                h("div.input-group", [
                    h("input.form-control", {
                        "placeholder": "view is the current view...",
                        "type": "text",
                    }),
                    h("span.input-group-btn", [
                        h("button.btn.btn-default", {"type": "button"}, [
                            "Eval JS",
                        ]),
                    ]),
                ]),
            ]);
        this.console = dom.create(consoleNode).domNode;
        this.evalInput =
            this.console.querySelector("input") as HTMLInputElement;
        this.evalButton = this.console.querySelector("button") as HTMLElement;
    }

    addView(id: string, label: string) {
        const node = h("li", [h("a#" + id, {href: "#"}, [label])]);
        this.viewMenu.appendChild(dom.create(node).domNode);
    }

    hideConsole() {
        if (this.consoleShown) {
            this.controlsRow.removeChild(this.console);
        }
    }

    showConsole() {
        if (!this.consoleShown) {
            this.controlsRow.appendChild(this.console);
        }
    }

    redraw(): void {
        // nothing needed
    }
}
