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

import * as menu from "./menu";
import "./top_toolbar.css";
import * as utils from "./utils";

export default class Toolbar {
    config;
    editor;
    hotkeys;
    menu;
    modal;
    netgraph;
    sim;
    toolbar;

    constructor(filename, sim) {
        console.assert(typeof filename === "string");

        this.sim = sim;
        this.modal = this.sim.modal;
        this.modal.toolbar = this; // TODO: remove this hack
        this.netgraph = this.modal.netgraph;
        this.hotkeys = this.modal.hotkeys;
        this.editor = this.modal.editor;
        this.config = this.netgraph.config;

        $("#Reset_layout_button")[0].addEventListener("click", () => {
            this.modal.title(
                "Are you sure you wish to reset this layout, removing all " +
                    "the graphs and resetting the position of all items?");
            this.modal.text_body("This operation cannot be undone!", "danger");
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
            this.config_modal();
        });
        $("#Sync_editor_button")[0].addEventListener("click", () => {
            this.editor.update_trigger = true;
        });
        $("#Help_button")[0].addEventListener("click", () => {
            this.hotkeys.callMenu();
        });
        $("#filename")[0].addEventListener("click", () => {
            this.save_as();
        });

        utils.safe_set_text($("#filename")[0], filename);

        // Update the URL so reload and bookmarks work as expected
        history.pushState({}, filename, "/?filename=" + filename);

        this.toolbar = $("#toolbar_object")[0];

        this.menu = new menu.Menu(this.toolbar);

        interact(this.toolbar).on("tap", () => {
            menu.hide_any();
        });
    }

    /**
     * Trims the filename and sends it to the server.
     */
    file_name() {
        const open_el = <HTMLInputElement> document.getElementById("open_file");
        console.assert(open_el.hasOwnProperty("value"));
        let filename = open_el.value;
        filename = filename.replace("C:\\fakepath\\", "");
        this.sim.ws.send("open" + filename);
    }

    /**
     * Reset the model layout to the default.
     *
     * This is done by deleting the config file and reloading the script.
     */
    reset_model_layout() {
        window.location.assign(
            "/?reset=True&filename=" + $("#filename")[0].innerHTML);
    }

    /**
     * Launch the config modal.
     *
     * This is done by calling the server to call config_modal_show with config
     * data.
     */
    config_modal() {
        // Doing it this way in case we need to save options to a file later
        this.sim.ws.send("config");
    }

    config_modal_show() {
        // Get current state in case user clicks cancel
        const original = {
            aspect_resize: this.netgraph.aspect_resize,
            auto_update: this.editor.auto_update,
            font_size: this.netgraph.font_size,
            scriptdir: this.config.scriptdir,
            transparent_nets: this.netgraph.transparent_nets,
            zoom: this.netgraph.zoom_fonts,
        };

        this.modal.title("Configure Options");
        this.modal.main_config();
        this.modal.footer("ok_cancel", e => {
            const modal = $("#myModalForm").data("bs.validator");
            modal.validate();
            if (modal.hasErrors() || modal.isIncomplete()) {
                return;
            }
            $("#OK").attr("data-dismiss", "modal");
        }, () => { // Cancel_function
            this.netgraph.zoom_fonts = original.zoom;
            this.netgraph.font_size = original.font_size;
            this.netgraph.transparent_nets = original.transparent_nets;
            this.netgraph.aspect_resize = original.aspect_resize;
            this.editor.auto_update = original.auto_update;
            this.config.scriptdir = original.scriptdir;
            $("#cancel-button").attr("data-dismiss", "modal");
        });

        $("#myModalForm").validator({
            custom: {
                my_validator: $item => {
                    const num = $item.val();
                    return (num.length <= 3 && num > 20);
                },
            },
        });

        this.modal.show();
    }

    save_as() {
        this.modal.title("Save file as");
        this.modal.clear_body();

        const filename = $("#filename")[0].innerHTML;

        const $form = $("<form class='form-horizontal' id" +
                        "='myModalForm'/>").appendTo(this.modal.$body);
        $("<div class='form-group' id='save-as-group'>" +
          "<input type='text' id='save-as-filename' class='form-control' " +
          "value='" + filename + "'/>" +
          "</div>").appendTo($form);

        this.modal.footer("ok_cancel", function() {
            const save_as_filename = $("#save-as-filename").val();
            if (save_as_filename !== filename) {
                const editor_code = this.editor.editor.getValue();
                this.editor.ws.send(JSON.stringify(
                    {code: editor_code, save: true, save_as: save_as_filename}
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
