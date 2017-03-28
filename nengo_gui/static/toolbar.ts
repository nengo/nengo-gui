/**
 * Toolbar for the top of the GUI.
 *
 * Toolbar constructor is written into HTML file by python and called
 * upon page load.
 *
 * @constructor
 * @param {string} filename - The name of the file opened
 */

import * as interact from "interact.js";

import { config, ConfigDialog } from "./config";
import { Editor } from "./editor";
import { Menu } from "./menu";
import { SimControl } from "./sim-control";
import * as utils from "./utils";
import { AlertDialogView, InputDialogView } from "./views/modal";
import { ToolbarView } from "./views/toolbar";
import { Connection } from "./websocket";

export class Toolbar {
    configDialog: ConfigDialog = new ConfigDialog();
    view = new ToolbarView();

    private attached: Connection[] = [];

    constructor(filename: string) {
        this.view.buttons["reset"].addEventListener("click", () => {
            this.askResetLayout();
        });
        this.view.buttons["undo"].addEventListener("click", () => {
            // TODO: connect netgraph
            // this.netgraph.notify({undo: "1"});
        });
        this.view.buttons["redo"].addEventListener("click", () => {
            // TODO: connect netgraph
            // this.netgraph.notify({undo: "0"});
        });
        // TODO: is this in side-menu now?
        this.view.buttons["utils"].addEventListener("click", () => {
            this.askConfig();
        });
        this.view.buttons["sync"].addEventListener("click", () => {
            // TODO: connect editor
            // this.editor.syncWithServer();
        });
        this.view.buttons["hotkeys"].addEventListener("click", () => {
            // TODO: hotkeys menu func
            // hotkeys.callMenu();
        });
        this.view.buttons["filename"].addEventListener("click", () => {
            this.askSaveAs();
        });

        this.filename = filename;

        // Update the URL so reload and bookmarks work as expected
        history.pushState({}, filename, "/?filename=" + filename);

        interact(this.view.root).on("tap", () => {
            Menu.hideAll();
        });
    }

    get filename(): string {
        return this.view.filename;
    }

    set filename(val: string) {
        this.view.filename = val;
    }

    attach(conn: Connection) {
        this.attached.push(conn);
    }

    askConfig() {
        // TODO: this should be called by the server
        this.configDialog.show();
    }

    askResetLayout() {
        const modal = new AlertDialogView(
            "This operation cannot be undone!", "danger"
        );
        modal.title = "Are you sure you wish to reset this layout, " +
            "removing all the graphs and resetting the position of all items?";
        const resetButton = modal.addFooterButton("Reset");
        modal.addCloseButton();
        resetButton.addEventListener("click", () => {
            this.resetModelLayout();
        });
        modal.show();
    }

    askSaveAs() {
        const modal = new InputDialogView(null, null);
        modal.title = "Save file as...";
        modal.input.value = this.filename;

        modal.ok.addEventListener("click", () => {
            const newFilename = modal.input.value;
            if (newFilename !== this.filename) {
                // TODO: connect to editor and do below
                // const editorCode = this.editor.editor.getValue();
                // TODO: make this an editor method
                // this.editor.ws.send(JSON.stringify(
                //     {code: editorCode, save: true, saveAs: newFilename}
                // ));
            }
            $(modal).modal("hide");
        });
        modal.ok.addEventListener("keypress", (event: KeyboardEvent) => {
            if (event.which === 13) {
                event.preventDefault();
                modal.ok.click();
            }
        });
        modal.show();
    }

    // TODO: does this ever get used...?
    // fileName() {
    //     const openEl = <HTMLInputElement> document.getElementById("openFile");
    //     console.assert(openEl.hasOwnProperty("value"));
    //     let filename = openEl.value;
    //     filename = filename.replace("C:\\fakepath\\", "");
    //     this.sim.ws.send("open" + filename);
    // }

    /**
     * Reset the model layout to the default.
     *
     * This is done by deleting the config file and reloading the script.
     */
    resetModelLayout() {
        // TODO: is this the best way to refresh? Does reset=True do anything?
        window.location.assign("/?reset=True&filename=" + this.filename);
    }

    /**
     * Launch the config modal.
     *
     * This is done by calling the server to call configModalShow with config
     * data.
     */
    configModal() {
        // Doing it this way in case we need to save options to a file later
        this.attached.forEach(conn => {
            conn.send("config"); // TODO: ???
        });
    }

}
