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
import * as $ from "jquery";

import { config } from "./config";
import { Editor } from "./editor";
import * as menu from "./menu";
import { Modal } from "./modal";
import { SimControl } from "./sim-control";
import "./toolbar.css";
import * as utils from "./utils";

export class Toolbar {
    editor: Editor;
    hotkeys;
    menu;
    modal: Modal;
    netgraph;
    sim: SimControl;
    toolbar;

    constructor(filename: string, sim: SimControl) {
        this.sim = sim;
        this.modal = this.sim.modal;
        this.modal.toolbar = this; // TODO: remove this hack
        this.netgraph = this.modal.netgraph;
        this.hotkeys = this.modal.hotkeys;
        this.editor = this.modal.editor;

        $("#Reset_layout_button")[0].addEventListener("click", () => {
            this.modal.title(
                "Are you sure you wish to reset this layout, removing all " +
                    "the graphs and resetting the position of all items?");
            this.modal.textBody("This operation cannot be undone!", "danger");
            this.modal.footer("confirm_reset");
            this.modal.show();
        });

        $("#Undo_last_button")[0].addEventListener("click", () => {
            this.netgraph.notify({undo: "1"});
        });
        $("#Redo_last_button")[0].addEventListener("click", () => {
            this.netgraph.notify({undo: "0"});
        });
        $("#Config_button")[0].addEventListener("click", () => {
            this.configModal();
        });
        $("#Sync_editor_button")[0].addEventListener("click", () => {
            this.editor.updateTrigger = true;
        });
        $("#Help_button")[0].addEventListener("click", () => {
            this.hotkeys.callMenu();
        });
        $("#filename")[0].addEventListener("click", () => {
            this.saveAs();
        });

        utils.safeSetText($("#filename")[0], filename);

        // Update the URL so reload and bookmarks work as expected
        history.pushState({}, filename, "/?filename=" + filename);

        this.toolbar = $("#toolbar_object")[0];

        this.menu = new menu.Menu(this.toolbar);

        interact(this.toolbar).on("tap", () => {
            menu.hideAny();
        });
    }

    /**
     * Trims the filename and sends it to the server.
     */
    fileName() {
        const openEl = <HTMLInputElement> document.getElementById("openFile");
        console.assert(openEl.hasOwnProperty("value"));
        let filename = openEl.value;
        filename = filename.replace("C:\\fakepath\\", "");
        this.sim.ws.send("open" + filename);
    }

    /**
     * Reset the model layout to the default.
     *
     * This is done by deleting the config file and reloading the script.
     */
    resetModelLayout() {
        window.location.assign(
            "/?reset=True&filename=" + $("#filename")[0].innerHTML);
    }

    /**
     * Launch the config modal.
     *
     * This is done by calling the server to call configModalShow with config
     * data.
     */
    configModal() {
        // Doing it this way in case we need to save options to a file later
        this.sim.ws.send("config");
    }

    configModalShow() {
        // Get current state in case user clicks cancel
        const original = {
            aspectResize: this.netgraph.aspectResize,
            autoUpdate: this.editor.autoUpdate,
            fontSize: this.netgraph.fontSize,
            scriptdir: config.scriptdir,
            transparentNets: this.netgraph.transparentNets,
            zoom: this.netgraph.zoomFonts,
        };

        this.modal.title("Configure Options");
        this.modal.mainConfig();
        this.modal.footer("ok_cancel", e => {
            const modal = $("#myModalForm").data("bs.validator");
            modal.validate();
            if (modal.hasErrors() || modal.isIncomplete()) {
                return;
            }
            $("#OK").attr("data-dismiss", "modal");
        }, () => { // CancelFunction
            this.netgraph.zoomFonts = original.zoom;
            this.netgraph.fontSize = original.fontSize;
            this.netgraph.transparentNets = original.transparentNets;
            this.netgraph.aspectResize = original.aspectResize;
            this.editor.autoUpdate = original.autoUpdate;
            config.scriptdir = original.scriptdir;
            $("#cancel-button").attr("data-dismiss", "modal");
        });

        $("#myModalForm").validator({
            custom: {
                myValidator: $item => {
                    const num = $item.val();
                    return (num.length <= 3 && num > 20);
                },
            },
        });

        this.modal.show();
    }

    saveAs() {
        this.modal.title("Save file as");
        this.modal.clearBody();

        const filename = $("#filename")[0].innerHTML;

        const $form = $("<form class='form-horizontal' id" +
                        "='myModalForm'/>").appendTo(this.modal.$body);
        $("<div class='form-group' id='save-as-group'>" +
          "<input type='text' id='save-as-filename' class='form-control' " +
          "value='" + filename + "'/>" +
          "</div>").appendTo($form);

        this.modal.footer("okCancel", function() {
            const saveAsFilename = $("#save-as-filename").val();
            if (saveAsFilename !== filename) {
                const editorCode = this.editor.editor.getValue();
                this.editor.ws.send(JSON.stringify(
                    {code: editorCode, save: true, saveAs: saveAsFilename}
                ));
            }
        });
        $("#OK").attr("data-dismiss", "modal");
        $("#save-as-filename").keypress(event => {
            if (event.which === 13) {
                event.preventDefault();
                $("#OK").click();
            }
        });
        this.modal.show();
    }
}
