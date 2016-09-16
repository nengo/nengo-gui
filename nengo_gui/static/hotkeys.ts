/**
 * Manages hotkeys.
 *
 * @constructor
 */

import { Editor } from "./editor";
import { Modal } from "./modal";
import { NetGraph } from "./netgraph/netgraph";
import { SimControl } from "./sim_control"

export class Hotkeys {
    active: boolean = true;
    editor: Editor;
    modal: Modal;
    netgraph: NetGraph;
    sim: SimControl;

    constructor(editor: Editor, modal) {
        this.editor = editor;
        this.netgraph = this.editor.netgraph;
        this.modal = modal;
        this.sim = this.modal.sim;

        document.addEventListener("keydown", event => {
            this.on_keydown(event);
        });
    }

    on_keydown(event: KeyboardEvent) {
        if (!this.active) {
            return;
        }

        const on_editor =
            (<Element> event.target).className === "ace_text-input";

        const ctrl = event.ctrlKey || event.metaKey;
        const shift = event.shiftKey;
        let key;
        if (event.hasOwnProperty("key")) {
            key = event.key;
        } else {
            if (event.keyCode === 191) {
                key = "?";
            } else if (event.keyCode === 8) {
                key = "backspace";
            } else if (event.keyCode === 13) {
                key = "enter";
            } else {
                key = String.fromCharCode(event.keyCode);
            }
        }
        key = key.toLowerCase();

        // Toggle editor with ctrl-e
        if (ctrl && key === "e") {
            this.editor.toggle_shown();
            event.preventDefault();
        }
        // Undo with ctrl-z
        if (ctrl && key === "z") {
            this.netgraph.notify({undo: "1"});
            event.preventDefault();
        }
        // Redo with shift-ctrl-z
        if (ctrl && shift && key === "z") {
            this.netgraph.notify({undo: "0"});
            event.preventDefault();
        }
        // Redo with ctrl-y
        if (ctrl && key === "y") {
            this.netgraph.notify({undo: "0"});
            event.preventDefault();
        }
        // Save with save-s
        if (ctrl && key === "s") {
            this.editor.save_file();
            event.preventDefault();
        }
        // Run model with spacebar or with shift-enter
        if ((key === " " && !on_editor) ||
            (event.shiftKey && key === "enter")) {
            if (!event.repeat) {
                this.sim.on_pause_click();
            }
            event.preventDefault();
        }
        // Bring up help menu with ?
        if (key === "?" && !on_editor) {
            this.callMenu();
            event.preventDefault();
        }
        // Bring up minimap with ctrl-m
        if (ctrl && key === "m") {
            this.netgraph.toggleMiniMap();
            event.preventDefault();
        }
        // Disable backspace navigation
        if (key === "backspace" && !on_editor) {
            event.preventDefault();
        }
        // Toggle auto-updating with TODO: pick a good shortcut
        if (ctrl && event.shiftKey && key === "1") {
            this.editor.auto_update = !this.editor.auto_update;
            this.editor.update_trigger = this.editor.auto_update;
            event.preventDefault();
        }
        // Trigger a single update with TODO: pick a good shortcut
        if (ctrl && !event.shiftKey && key === "1") {
            this.editor.update_trigger = true;
            event.preventDefault();
        }
    }

    callMenu() {
        this.modal.title("Hotkeys list");
        this.modal.footer("close");
        this.modal.help_body();
        this.modal.show();
    }

    /**
     * Turn hotkeys on or off.
     *
     * set_active is provided with a boolean argument, which will either
     * turn the hotkeys on or off.
     */
    set_active(bool) {
        console.assert(typeof(bool) === "boolean");
        this.active = bool;
    }
}
