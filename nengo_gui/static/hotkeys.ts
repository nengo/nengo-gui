/**
 * Manages hotkeys.
 *
 * @constructor
 */
export default class Hotkeys {
    active;
    editor;
    netgraph;
    modal;
    sim;

    constructor(editor, modal) {
        this.active = true;
        this.editor = editor;
        this.netgraph = this.editor.netgraph;
        this.modal = modal;
        this.sim = this.modal.sim;

        document.addEventListener("keydown", ev => {
            if (this.active) {

                const on_editor =
                    (<Element> ev.target).className === "ace_text-input";

                const ctrl = ev.ctrlKey || ev.metaKey;
                let key;
                if (ev.hasOwnProperty("key")) {
                    key = ev.key;
                } else {
                    switch (ev.keyCode) {
                    case 191:
                        key = "?";
                        break;
                    case 8:
                        key = "backspace";
                        break;
                    case 13:
                        key = "enter";
                        break;
                    default:
                        key = String.fromCharCode(ev.keyCode);
                    }
                }
                key = key.toLowerCase();

                // Toggle editor with ctrl-e
                if (ctrl && key === "e") {
                    this.editor.toggle_shown();
                    ev.preventDefault();
                }
                // Undo with ctrl-z
                if (ctrl && key === "z") {
                    this.netgraph.notify({undo: "1"});
                    ev.preventDefault();
                }
                // Redo with shift-ctrl-z
                if (ctrl && ev.shiftKey && key === "z") {
                    this.netgraph.notify({undo: "0"});
                    ev.preventDefault();
                }
                // Redo with ctrl-y
                if (ctrl && key === "y") {
                    this.netgraph.notify({undo: "0"});
                    ev.preventDefault();
                }
                // Save with save-s
                if (ctrl && key === "s") {
                    this.editor.save_file();
                    ev.preventDefault();
                }
                // Run model with spacebar or with shift-enter
                if ((key === " " && !on_editor) ||
                    (ev.shiftKey && key === "enter")) {
                    if (!ev.repeat) {
                        this.sim.on_pause_click();
                    }
                    ev.preventDefault();
                }
                // Bring up help menu with ?
                if (key === "?" && !on_editor) {
                    this.callMenu();
                    ev.preventDefault();
                }
                // Bring up minimap with ctrl-m
                if (ctrl && key === "m") {
                    this.netgraph.toggleMiniMap();
                    ev.preventDefault();
                }
                // Disable backspace navigation
                if (key === "backspace" && !on_editor) {
                    ev.preventDefault();
                }
                // Toggle auto-updating with TODO: pick a good shortcut
                if (ctrl && ev.shiftKey && key === "1") {
                    this.editor.auto_update = !this.editor.auto_update;
                    this.editor.update_trigger = this.editor.auto_update;
                    ev.preventDefault();
                }
                // Trigger a single update with TODO: pick a good shortcut
                if (ctrl && !ev.shiftKey && key === "1") {
                    this.editor.update_trigger = true;
                    ev.preventDefault();
                }
            }
        });
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
