/**
 * Menu for the side of the GUI.
 *
 * SideMenu constructor is written into HTML file by python and called
 * upon page load.
 */

import { config, ConfigDialog } from "./config";
import { Connection } from "./server";
import * as utils from "./utils";
import { AlertDialogView } from "./views/modal";
import { SidebarView } from "./views/sidebar";

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

        server.bind("sidebar.show", () => { this.hidden = false; });
        server.bind("sidebar.hide", () => { this.hidden = true; });
        server.bind("sidebar.toggle", () => { this.hidden = !this.hidden; });

        this.server = server;
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
            const svgXml = (new XMLSerializer()).serializeToString(svg);
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
}
