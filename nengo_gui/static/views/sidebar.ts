import { VNode, dom, h } from "maquette";

import "./sidebar.css";

export class SidebarView {
    root: HTMLDivElement;

    constructor() {
        const node = h("div.sidebar");
        this.root = dom.create(node).domNode as HTMLDivElement;
    }

    get width(): number {
        return this.root.offsetWidth;
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
}

export class FilebrowserView extends SidebarView {
    filebrowser: HTMLDivElement;

    constructor() {
        super();
        this.root.classList.add("filebrowser");
    }

}

export class UtilitiesView extends SidebarView {
    actions: {[name: string]: HTMLDivElement};
    groups: Array<{content: HTMLDivElement, heading: HTMLDivElement}> = [];

    constructor() {
        super();
        this.root.classList.add("accordion-container");

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
        this.root.appendChild(div);
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
        this.root.appendChild(headingDiv);
        const contentNode =
            h("div.accordion-content", items.map(
                item => this.action(item.label, item.icon, true)
            ));
        const contentDiv = dom.create(contentNode).domNode as HTMLDivElement;
        this.root.appendChild(contentDiv);
        this.groups.push({content: contentDiv, heading: headingDiv});

        // Convert HTMLCollection to array
        return Array.prototype.slice.call(
            contentDiv.getElementsByClassName("sidebar-item")
        ) as Array<HTMLDivElement>;
    }
}
