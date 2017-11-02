import { VNode, dom, h } from "maquette";

import "./sidebar.css";
import * as utils from "../utils";

export class SidebarView {
    actions: {[name: string]: HTMLDivElement};
    filebrowser: HTMLDivElement;
    groups: Array<{content: HTMLDivElement, heading: HTMLDivElement}> = [];
    root: HTMLDivElement;
    utilities: HTMLDivElement;

    constructor() {
        const node = h("div.sidebar", [
            h("div.filebrowser.active"),
            h("div.accordion-container"),
        ]);
        this.root = dom.create(node).domNode as HTMLDivElement;
        this.filebrowser =
            this.root.querySelector(".filebrowser") as HTMLDivElement;
        this.utilities =
            this.root.querySelector(".accordion-container") as HTMLDivElement;

        this.actions = {
            "config": this.addAction("Configure settings", "cog"),
            "minimap": this.addAction("Toggle minimap", "credit-card"),
        };
        [this.actions["data"], this.actions["svg"]] = this.addActionGroup(
            "Download...", [
                {label: "Simulation data as CSV", icon: "signal"},
                {label: "Network layout as SVG", icon: "picture"},
            ]
        );
    }

    get active(): string {
        if (this.filebrowser.classList.contains("active")) {
            return "filebrowser";
        } else if (this.utilities.classList.contains("active")) {
            return "utilities";
        } else {
            console.error("No sidebar tab is active")
        }
    }

    set active(val: string) {
        if (val === "filebrowser") {
            this.filebrowser.classList.add("active");
            this.utilities.classList.remove("active");
        } else if (val === "utilities") {
            this.utilities.classList.add("active");
            this.filebrowser.classList.remove("active");
        } else {
            console.error(`${val} not a valid sidebar tab`)
        }
    }

    get hidden(): boolean {
        return this.root.classList.contains("hidden");
    }

    set hidden(val: boolean) {
        if (val) {
            this.root.classList.add("hidden");
        } else {
            this.root.classList.remove("hidden");
        }
    }

    get width(): number {
        return this.root.offsetWidth;
    }

    private action(label: string, icon: string, indent: boolean = false): VNode {
        return h("div.sidebar-item" + (indent ? ".indent" : ""), [
            h("span.title", [label]),
            h("span.glyphicon.glyphicon-" + icon),
        ]);
    }

    addAction(label: string, icon: string): HTMLDivElement {
        const div = dom.create(
            this.action(label, icon)
        ).domNode as HTMLDivElement;
        this.utilities.appendChild(div);
        return div;
    }

    addActionGroup(
        heading: string,
        items: Array<{label: string, icon: string}>
    ): Array<HTMLDivElement> {
        const headingNode =
            h("div.accordion-toggle.sidebar-item", [
                h("span.title", [heading]),
                h("span.glyphicon.glyphicon-chevron-down"),
            ]);
        const headingDiv = dom.create(headingNode).domNode as HTMLDivElement;
        this.utilities.appendChild(headingDiv);
        const contentNode =
            h("div.accordion-content", items.map(
                item => this.action(item.label, item.icon, true)
            ));
        const contentDiv = dom.create(contentNode).domNode as HTMLDivElement;
        this.utilities.appendChild(contentDiv);
        this.groups.push({content: contentDiv, heading: headingDiv});

        // Convert HTMLCollection to array
        return utils.toArray(
            contentDiv.getElementsByClassName("sidebar-item")
        );
    }
}
