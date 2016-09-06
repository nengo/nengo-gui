/**
 * Code Editor
 *
 * Ace function is written into HTML by server and called when the
 * page is loaded.
 *
 * @constructor
 * @param {string} uid - A unique identifier
 * @param {dict} args - A set of constructor arguments (see Component)
 */

import * as ace from "brace";
import "brace/mode/python";
import * as interact from "interact.js";
import * as $ from "jquery";

import "./editor.css";
import * as utils from "./utils";

const Range = ace.acequire("ace/range").Range;

export default class Editor {
    auto_update;
    config;
    console;
    console_error;
    console_height;
    console_stdout;
    current_code;
    editor;
    font_size;
    hidden;
    marker;
    max_width;
    min_width;
    netgraph;
    save_disabled;
    update_trigger;
    viewport;
    width;
    ws;

    constructor(uid, netgraph) {
        this.netgraph = netgraph;
        this.config = this.netgraph.config;
        this.viewport = this.netgraph.viewport;

        if (uid[0] === "<") {
            console.error("invalid uid for Editor: " + uid);
        }
        this.min_width = 50;
        this.max_width = $(window).width() - 100;

        this.ws = utils.create_websocket(uid);
        this.ws.onmessage = event => {
            this.on_message(event);
        };

        this.current_code = "";
        const code_div = document.createElement("div");
        code_div.id = "editor";
        $("#rightpane").append(code_div);
        this.editor = ace.edit("editor");
        this.editor.getSession().setMode("ace/mode/python");
        this.editor.gotoLine(1);
        this.marker = null;

        this.console = document.createElement("div");
        this.console.id = "console";
        $("#rightpane").append(this.console);
        this.console_height = this.config.console_height;
        this.console_stdout = document.createElement("pre");
        this.console_error = document.createElement("pre");
        this.console_stdout.id = "console_stdout";
        this.console_error.id = "console_error";
        this.console.appendChild(this.console_stdout);
        this.console.appendChild(this.console_error);
        $("#console").height(this.console_height);

        this.save_disabled = true;
        // If an update of the model from the code editor is allowed
        this.update_trigger = true;
        // Automatically update the model based on the text
        this.auto_update = true;

        // Setup the button to toggle the code editor
        $("#Toggle_ace").on("click", () => {
            this.toggle_shown();
        });
        $("#Save_file").on("click", () => {
            this.save_file();
        });
        $("#Font_increase").on("click", () => {
            this.font_size += 1;
        });
        $("#Font_decrease").on("click", () => {
            this.font_size -= 1;
        });

        this.schedule_updates();

        Object.defineProperty(this, "width", {
            get: () => {
                return this.config.editor_width;
            },
            set: val => {
                val = Math.max(Math.min(val, this.max_width), this.min_width);
                $("#rightpane").width(val);
                this.config.editor_width = val;
            },
        });

        Object.defineProperty(this, "hidden", {
            get: () => {
                return this.config.hide_editor;
            },
            set: val => {
                this.config.hide_editor = val;
                if (val) {
                    this.hide_editor();
                } else {
                    this.show_editor();
                }
            },
        });

        Object.defineProperty(this, "font_size", {
            get: () => {
                return this.config.editor_font_size;
            },
            set: val => {
                val = Math.max(val, 6);
                this.editor.setFontSize(val);
                this.config.editor_font_size = val;
            },
        });

        // Automatically update the model based on the text
        Object.defineProperty(this, "auto_update", {
            get: () => {
                return this.config.auto_update;
            },
            set: val => {
                this.update_trigger = val;
                this.config.auto_update = val;
            },
        });

        this.width = this.config.editor_width;
        this.hidden = this.config.hide_editor;
        this.font_size = this.config.editor_font_size;
        this.auto_update = this.config.auto_update;
        this.redraw();

        $(window).on("resize", () => {
            this.on_resize();
        });
        interact("#editor")
            .resizable({
                edges: { bottom: false, left: true, right: false, top: false },
            }).on("resizemove", event => {
                this.width -= event.deltaRect.left;
                this.redraw();
            });

        interact("#console")
            .resizable({
                edges: { bottom: false, left: true, right: false, top: true },
            }).on("resizemove", event => {
                const max = $("#rightpane").height() - 40;
                const min = 20;

                this.console_height -= event.deltaRect.top;

                this.console_height = utils.clip(this.console_height, min, max);
                $("#console").height(this.console_height);

                this.width -= event.deltaRect.left;
                this.redraw();
            }).on("resizeend", event => {
                this.config.console_height = this.console_height;
            });
    }

    /**
     * Send changes to the code to server every 100ms.
     */
    schedule_updates() {
        setInterval(() => {
            const editor_code = this.editor.getValue();
            if (editor_code !== this.current_code) {
                if (this.update_trigger) {
                    this.update_trigger = this.auto_update;
                    this.ws.send(JSON.stringify({
                        code: editor_code,
                        save: false,
                    }));
                    this.current_code = editor_code;
                    this.enable_save();
                    $("#Sync_editor_button").addClass("disabled");
                } else {
                    // Visual indication that the code is different
                    // than the model displayed
                    $("#Sync_editor_button").removeClass("disabled");
                }
            }
        }, 100);
    }

    save_file() {
        if (!($("#Save_file").hasClass("disabled"))) {
            const editor_code = this.editor.getValue();
            this.ws.send(JSON.stringify({code: editor_code, save: true}));
            this.disable_save();
        }
    }

    enable_save() {
        $("#Save_file").removeClass("disabled");
    }

    disable_save() {
        $("#Save_file").addClass("disabled");
    }

    on_message(event) {
        const msg = JSON.parse(event.data);
        if (msg.code !== undefined) {
            this.editor.setValue(msg.code);
            this.current_code = msg.code;
            this.editor.gotoLine(1);
            this.redraw();
            this.disable_save();
        } else if (msg.error === null) {
            if (this.marker !== null) {
                this.editor.getSession().removeMarker(this.marker);
                this.marker = null;
                this.editor.getSession().clearAnnotations();
            }
            $(this.console_stdout).text(msg.stdout);
            $(this.console_error).text("");
            this.console.scrollTop = this.console.scrollHeight;
        } else if (msg.filename !== undefined) {
            if (msg.valid) {
                utils.safe_set_text($("#filename")[0], msg.filename);
                // Update the URL so reload and bookmarks work as expected
                history.pushState(
                    {}, msg.filename, "/?filename=" + msg.filename);
            } else {
                alert(msg.error);
            }
        } else if (msg.error !== undefined) {
            const line = msg.error.line;
            this.marker = this.editor.getSession()
                .addMarker(new Range(line - 1, 0, line - 1, 10),
                           "highlight", "fullLine", true);
            this.editor.getSession().setAnnotations([{
                row: line - 1,
                text: msg.short_msg,
                type: "error",
            }]);
            $(this.console_stdout).text(msg.stdout);
            $(this.console_error).text(msg.error.trace);
            this.console.scrollTop = this.console.scrollHeight;
        } else {
            console.warn("Unhandled message: " + msg);
        }
    }

    on_resize() {
        this.max_width = $(window).width() - 100;
        if (this.width > this.max_width) {
            this.width = this.max_width;
        }
        this.redraw();
    }

    show_editor() {
        const editor = document.getElementById("rightpane");
        editor.style.display = "flex";
        this.redraw();
    }

    hide_editor() {
        const editor = document.getElementById("rightpane");
        editor.style.display = "none";
        this.redraw();
    }

    toggle_shown() {
        if (this.hidden) {
            this.hidden = false;
        } else {
            this.hidden = true;
        }
        this.redraw();
    }

    redraw() {
        this.editor.resize();
        if (this.netgraph !== undefined) {
            this.netgraph.on_resize();
        }
        this.viewport.on_resize();
    }
}
