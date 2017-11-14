/**
 * Menu for the side of the GUI.
 *
 * SideMenu constructor is written into HTML file by python and called
 * upon page load.
 */

import { VNode, dom, h } from "maquette";

import "./sidebar.css";

import { config, ConfigDialog } from "./config";
import { AlertDialogView } from "./modal";
import { Connection } from "./server";
import * as utils from "./utils";

export class Sidebar {
    configDialog: ConfigDialog = new ConfigDialog();
    view: SidebarView = new SidebarView();

    private server: Connection;

    constructor(server: Connection) {
        this.view.actions["config"].addEventListener("click", () => {
            this.askConfig();
        });
        this.view.actions["minimap"].addEventListener("click", () => {
            // TODO: how to toggle minimap?
            // this.netgraph.toggleMiniMap();
            console.log("TODO");
        });
        this.view.actions["data"].addEventListener("click", () => {
            this.askData();
        });
        this.view.actions["svg"].addEventListener("click", () => {
            this.askSVG();
        });

        this.view.groups.forEach((group, i) => {
            const otherGroups = this.view.groups.filter((g, j) => i !== j);
            group["heading"].addEventListener("click", () => {
                $(group["content"]).slideToggle();
                otherGroups.forEach(other => $(other["content"]).slideUp());
            });
        });

        server.bind("sidebar.show", () => {
            this.hidden = false;
        });
        server.bind("sidebar.hide", () => {
            this.hidden = true;
        });
        server.bind("sidebar.toggle", () => {
            this.hidden = !this.hidden;
        });
        server.bind("sidebar.filebrowser", () => {
            this.hidden = false;
            this.active = "filebrowser";
            // TODO: Do we sync the filebrowser here?
        });
        server.bind("sidebar.utilities", () => {
            this.hidden = false;
            this.active = "utilities";
        });

        document.addEventListener("nengoConfigChange", (event: CustomEvent) => {
            const key = event.detail;
            if (key === "scriptdir") {
                this.syncFilebrowser();
            }
        });

        this.server = server;
        this.hidden = true; // Always start hidden
        this.syncFilebrowser(); // Do a first sync
    }

    get active(): string {
        return this.view.active;
    }

    set active(val: string) {
        if (val !== this.view.active) {
            this.view.active = val;
        }
    }

    get hidden(): boolean {
        return this.view.hidden;
    }

    set hidden(val: boolean) {
        if (val !== this.view.hidden) {
            this.view.hidden = val;
        }
    }

    get width(): number {
        return this.view.width;
    }

    /**
     * Deselects all menu tabs.
     */
    // TODO: Move to toolbar
    // focusReset() {
    //     this.topButtons.forEach(button => {
    //         $(button).removeClass("selected");
    //     });
    // }

    /**
     * Launch the config modal.
     */
    askConfig() {
        // TODO: this should be called by the server???
        // TODO: when should we appendChild?
        document.body.appendChild(this.configDialog.view.root);
        this.configDialog.show();
    }

    /**
     * Export the graph data to the CSV in Downloads folder.
     */
    askData() {
        const modal = new AlertDialogView("Do you want to save the CSV file?");
        modal.title = "Export the graph data to CSV";

        const save = modal.addFooterButton("Save");
        save.addEventListener("click", () => {
            // TODO: remove jquery
            // TODO: move logic elsewhere? events?

            // const csv = allComponents.toCSV();
            // Extract filename from the path
            const path = $("#filename")[0].textContent;
            let filename = path.split("/").pop();
            filename = filename.split(".")[0];

            // TODO
            // const uri =
            //     "data:text/csv;charset=utf-8," + encodeURIComponent(csv);

            // const link = document.createElement("a");
            // link.href = uri;
            // link.style.visibility = "hidden";

            // Experimental future feature; uncomment when finalized.
            // link.download = filename + ".csv";
            // Adding element to the DOM (needed for Firefox)
            // document.body.appendChild(link);
            // link.click();
            // document.body.removeChild(link);
            $(modal).modal("hide");
        });
        $(modal.root).on("hidden.bs.modal", () => {
            document.body.removeChild(modal.root);
        });
        document.body.appendChild(modal.root);
        modal.show();
    }

    /**
     * Export the layout to the SVG in Downloads folder.
     */
    askSVG() {
        const modal = new AlertDialogView("Do you want to save the SVG file?");
        modal.title = "Export the layout to SVG";

        const save = modal.addFooterButton("Save");
        save.addEventListener("click", () => {
            // TODO: without jquery
            const svg = $("#main svg")[0];

            // Serialize SVG as XML
            const svgXml = new XMLSerializer().serializeToString(svg);
            let source = "<?xml version='1.0' standalone='no'?>" + svgXml;
            source = source.replace("&lt;", "<");
            source = source.replace("&gt;", ">");

            const svgUri = "data:image/svg+xml;base64," + btoa(source);

            // Extract filename from the path
            // TODO: without jquery
            const path = $("#filename")[0].textContent;
            let filename = path.split("/").pop();
            filename = filename.split(".")[0];

            // Initiate download
            const link = document.createElement("a");
            // Experimental future feature; uncomment when finalized.
            // link.download = filename + ".svg";
            link.href = svgUri;

            // Adding element to the DOM (needed for Firefox)
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            $(modal).modal("hide");
        });
        $(modal.root).on("hidden.bs.modal", () => {
            document.body.removeChild(modal.root);
        });
        document.body.appendChild(modal.root);
        modal.show();
    }

    syncFilebrowser() {
        this.server.send("filebrowser.browse");
        $(this.view.filebrowser).fileTree(
            {
                script: "/browse?root=" + config.scriptdir,
                root: config.scriptdir
            },
            file => {
                window.location.assign("/?filename=" + file);
            }
        );
    }
}

export class SidebarView {
    actions: { [name: string]: HTMLDivElement };
    filebrowser: HTMLDivElement;
    groups: Array<{ content: HTMLDivElement; heading: HTMLDivElement }> = [];
    root: HTMLDivElement;
    utilities: HTMLDivElement;

    constructor() {
        const node = h("div.sidebar", [
            h("div.filebrowser.active"),
            h("div.accordion-container")
        ]);
        this.root = dom.create(node).domNode as HTMLDivElement;
        this.filebrowser = this.root.querySelector(
            ".filebrowser"
        ) as HTMLDivElement;
        this.utilities = this.root.querySelector(
            ".accordion-container"
        ) as HTMLDivElement;

        this.actions = {
            config: this.addAction("Configure settings", "cog"),
            minimap: this.addAction("Toggle minimap", "credit-card")
        };
        [
            this.actions["data"],
            this.actions["svg"]
        ] = this.addActionGroup("Download...", [
            { label: "Simulation data as CSV", icon: "signal" },
            { label: "Network layout as SVG", icon: "picture" }
        ]);
    }

    get active(): string {
        if (this.filebrowser.classList.contains("active")) {
            return "filebrowser";
        } else if (this.utilities.classList.contains("active")) {
            return "utilities";
        } else {
            console.error("No sidebar tab is active");
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
            console.error(`${val} not a valid sidebar tab`);
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

    private action(
        label: string,
        icon: string,
        indent: boolean = false
    ): VNode {
        return h("div.sidebar-item" + (indent ? ".indent" : ""), [
            h("span.title", [label]),
            h("span.glyphicon.glyphicon-" + icon)
        ]);
    }

    addAction(label: string, icon: string): HTMLDivElement {
        const div = dom.create(this.action(label, icon))
            .domNode as HTMLDivElement;
        this.utilities.appendChild(div);
        return div;
    }

    addActionGroup(
        heading: string,
        items: Array<{ label: string; icon: string }>
    ): Array<HTMLDivElement> {
        const headingNode = h("div.accordion-toggle.sidebar-item", [
            h("span.title", [heading]),
            h("span.glyphicon.glyphicon-chevron-down")
        ]);
        const headingDiv = dom.create(headingNode).domNode as HTMLDivElement;
        this.utilities.appendChild(headingDiv);
        const contentNode = h(
            "div.accordion-content",
            items.map(item => this.action(item.label, item.icon, true))
        );
        const contentDiv = dom.create(contentNode).domNode as HTMLDivElement;
        this.utilities.appendChild(contentDiv);
        this.groups.push({ content: contentDiv, heading: headingDiv });

        // Convert HTMLCollection to array
        return utils.toArray(contentDiv.getElementsByClassName("sidebar-item"));
    }
}
