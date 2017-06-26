import { VNode, dom, h } from "maquette";

import "./view.css";

export class ControlGroupView {
    evalButton: HTMLButtonElement;
    evalOutput: HTMLElement;
    input: HTMLInputElement;
    removeButton: HTMLButtonElement;
    root: HTMLDivElement;

    constructor(label: string) {
        const node =
            h("div.control-group.last", [
                h("div", [
                    h("p", [h("code", [`var obj = new ${label}(...);`])]),
                    h("button.btn.btn-xs.btn-default.pull-right#remove", [
                        `Remove ${label}`,
                    ]),
                ]),
                h("div.input-group", [
                    h("input.form-control", {
                        "spellcheck": false,
                        "type": "text"
                    }),
                    h("span.input-group-btn", [
                        h("button.btn.btn-default#eval", {"type": "button"}, [
                            "Eval JS",
                        ]),
                    ]),
                ]),
                h("div", [
                    h("p", [
                        h("code", [h("span.glyphicon.glyphicon-console")]),
                    ]),
                    h("p", [h("code#output")]),
                ]),
            ]);
        this.root = dom.create(node).domNode as HTMLDivElement;
        this.input = this.root.querySelector("input") as HTMLInputElement;
        this.evalButton =
            this.root.querySelector("#eval") as HTMLButtonElement;
        this.evalOutput = this.root.querySelector("#output") as HTMLElement;
        this.removeButton =
            this.root.querySelector("#remove") as HTMLButtonElement;
    }

    addConnectButton() {
        const node =
            h("button.btn.btn-xs.btn-default.pull-right#connect", [
                "Connect to random object",
            ]);
        const button = dom.create(node).domNode as HTMLButtonElement;
        this.root.firstChild.appendChild(button);
        return button;
    }
}

export class DebugView {
    iframe: HTMLIFrameElement;
    log: HTMLButtonElement;
    outline: HTMLButtonElement;
    root: HTMLDivElement;
    private controls: HTMLDivElement;
    private menus: {[id: string]: HTMLDivElement};

    constructor() {
        const button = (
            id: string,
            icon: string,
            {active: active = false} = {}
        ): VNode => {
            let activeClass = "";
            if (active) {
                activeClass = ".active";
            }

            return h(`button.btn.btn-default.btn-block${activeClass}#${id}`, {
                "autocomplete": "off",
                "data-toggle": "button",
                "type": "button",
            }, [
                h(`span.glyphicon.glyphicon-${icon}`),
            ]);
        };
        const menu = (id: string, label: string = ""): VNode => {
            let text = `Add ${label}`;
            if (label === "") {
                text = "Add"; // Remove the trailing space
            }
            return h(`div.dropup#${id}`, [
                h("button.btn.btn-default.btn-block.dropdown-toggle", {
                    "data-toggle": "dropdown",
                    "type": "button",
                }, [text, h("span.caret")]),
                h("ul.dropdown-menu"),
            ]);
        };

        const node =
            h("div.debug", [
                h("div.debug-controls", [
                    h("div.control-group", [
                        button("outline", "th"),
                        button("log", "info-sign", {active: true}),
                    ]),
                    h("div.control-group", [
                        menu("main"),
                        menu("view", "View"),
                        menu("component", "Component"),
                        menu("componentview", "Component View"),
                    ]),
                ]),
                h("iframe", {src: "nengo.html"}),
            ]);
        this.root = dom.create(node).domNode as HTMLDivElement;
        this.iframe = this.root.querySelector("iframe") as HTMLIFrameElement;
        this.controls =
            this.root.querySelector(".debug-controls") as HTMLDivElement;
        this.outline =
            this.controls.querySelector("#outline") as HTMLButtonElement;
        this.log = this.controls.querySelector("#log") as HTMLButtonElement;
        this.menus = {
            component: (
                this.controls.querySelector("#component") as HTMLDivElement
            ),
            componentview: (
                this.controls.querySelector("#componentview") as HTMLDivElement
            ),
            main: this.controls.querySelector("#main") as HTMLDivElement,
            view: this.controls.querySelector("#view") as HTMLDivElement,
        };
    }

    addControlGroup(label: string) {
        const group = new ControlGroupView(label);
        this.controls.appendChild(group.root);
        return group;
    }

    register(category: string, typeName: string) {
        const node = h("li", [h("a", {href: "#"}, [typeName])]);
        const root = dom.create(node).domNode;
        this.menus[category].querySelector(".dropdown-menu").appendChild(root);
        return root.querySelector("a") as HTMLAnchorElement;
    }

    removeControlGroup(group: ControlGroupView) {
        this.controls.removeChild(group.root);
    }
}
