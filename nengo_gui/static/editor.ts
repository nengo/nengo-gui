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

import { config } from "./config";
import "./editor.css";
import * as utils from "./utils";
import * as viewport from "./viewport";
import { WSConnection } from "./websocket";

const Range = ace.acequire("ace/range").Range;

export class Editor {
    console;
    consoleError;
    consoleHeight;
    consoleStdout;
    currentCode;
    editor;
    marker;
    maxWidth;
    minWidth;
    netgraph;
    saveDisabled;
    updateTrigger;
    ws;

    constructor(uid, netgraph) {
        this.netgraph = netgraph;

        if (uid[0] === "<") {
            console.error("invalid uid for Editor: " + uid);
        }
        this.minWidth = 50;
        this.maxWidth = $(window).width() - 100;

        this.ws = new WSConnection(uid); // TODO: , "editor");
        this.ws.onmessage = function(event) {
            this.onmessage(event);
        };

        this.currentCode = "";
        const codeDiv = document.createElement("div");
        codeDiv.id = "editor";
        $("#rightpane").append(codeDiv);
        this.editor = ace.edit("editor");
        this.editor.getSession().setMode("ace/mode/python");
        this.editor.gotoLine(1);
        this.marker = null;

        this.console = document.createElement("div");
        this.console.id = "console";
        $("#rightpane").append(this.console);
        this.consoleHeight = config.consoleHeight;
        this.consoleStdout = document.createElement("pre");
        this.consoleError = document.createElement("pre");
        this.consoleStdout.id = "consoleStdout";
        this.consoleError.id = "consoleError";
        this.console.appendChild(this.consoleStdout);
        this.console.appendChild(this.consoleError);
        $("#console").height(this.consoleHeight);

        this.saveDisabled = true;
        // If an update of the model from the code editor is allowed
        this.updateTrigger = true;
        // Automatically update the model based on the text
        this.autoUpdate = true;

        // Setup the button to toggle the code editor
        $("#Toggle_ace").on("click", function() {
            this.toggleShown();
        });
        $("#Save_file").on("click", function() {
            this.saveFile();
        });
        $("#Font_increase").on("click", function() {
            this.fontSize += 1;
        });
        $("#Font_decrease").on("click", function() {
            this.fontSize -= 1;
        });

        this.scheduleUpdates();

        this.width = config.editorWidth;
        this.hidden = config.hideEditor;
        this.fontSize = config.editorFontSize;
        this.autoUpdate = config.autoUpdate;
        this.redraw();

        $(window).on("resize", function() {
            this.onresize();
        });
        interact("#editor")
            .resizable({
                edges: { bottom: false, left: true, right: false, top: false },
            }).on("resizemove", function(event) {
                this.width -= event.deltaRect.left;
                this.redraw();
            });

        interact("#console")
            .resizable({
                edges: { bottom: false, left: true, right: false, top: true },
            }).on("resizemove", function(event) {
                const max = $("#rightpane").height() - 40;
                const min = 20;

                this.consoleHeight -= event.deltaRect.top;

                this.consoleHeight = utils.clip(this.consoleHeight, min, max);
                $("#console").height(this.consoleHeight);

                this.width -= event.deltaRect.left;
                this.redraw();
            }).on("resizeend", function(event) {
                config.consoleHeight = this.consoleHeight;
            });
    }

    get width(): number {
        return config.editorWidth;
    }

    set width(val: number) {
        val = Math.max(Math.min(val, this.maxWidth), this.minWidth);
        $("#rightpane").width(val);
        config.editorWidth = val;
    }

    get hidden(): boolean {
        return config.hideEditor;
    }

    set hidden(val: boolean) {
        config.hideEditor = val;
        if (val) {
            this.hideEditor();
        } else {
            this.showEditor();
        }
    }

    get fontSize(): number {
        return config.editorFontSize;
    }

    set fontSize(val: number) {
        val = Math.max(val, 6);
        this.editor.setFontSize(val);
        config.editorFontSize = val;
    }

    get autoUpdate(): boolean {
        return config.autoUpdate;
    }

    set autoUpdate(val: boolean) {
        this.updateTrigger = val;
        config.autoUpdate = val;
    }

    /**
     * Send changes to the code to server every 100ms.
     */
    scheduleUpdates() {
        setInterval(function() {
            const editorCode = this.editor.getValue();
            if (editorCode !== this.currentCode) {
                if (this.updateTrigger) {
                    this.updateTrigger = this.autoUpdate;
                    this.ws.send(JSON.stringify({
                        code: editorCode,
                        save: false,
                    }));
                    this.currentCode = editorCode;
                    this.enableSave();
                    $("#Sync_editor_button").addClass("disabled");
                } else {
                    // Visual indication that the code is different
                    // than the model displayed
                    $("#Sync_editor_button").removeClass("disabled");
                }
            }
        }, 100);
    }

    saveFile() {
        if (!($("#Save_file").hasClass("disabled"))) {
            const editorCode = this.editor.getValue();
            this.ws.send(JSON.stringify({code: editorCode, save: true}));
            this.disableSave();
        }
    }

    enableSave() {
        $("#Save_file").removeClass("disabled");
    }

    disableSave() {
        $("#Save_file").addClass("disabled");
    }

    onmessage(event) {
        const msg = JSON.parse(event.data);
        if (msg.code !== undefined) {
            this.editor.setValue(msg.code);
            this.currentCode = msg.code;
            this.editor.gotoLine(1);
            this.redraw();
            this.disableSave();
        } else if (msg.error === null) {
            if (this.marker !== null) {
                this.editor.getSession().removeMarker(this.marker);
                this.marker = null;
                this.editor.getSession().clearAnnotations();
            }
            $(this.consoleStdout).text(msg.stdout);
            $(this.consoleError).text("");
            this.console.scrollTop = this.console.scrollHeight;
        } else if (msg.filename !== undefined) {
            if (msg.valid) {
                $("#filename")[0].innerHTML = msg.filename;
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
                text: msg.shortMsg,
                type: "error",
            }]);
            $(this.consoleStdout).text(msg.stdout);
            $(this.consoleError).text(msg.error.trace);
            this.console.scrollTop = this.console.scrollHeight;
        } else {
            console.warn("Unhandled message: " + msg);
        }
    }

    onresize() {
        this.maxWidth = $(window).width() - 100;
        if (this.width > this.maxWidth) {
            this.width = this.maxWidth;
        }
        this.redraw();
    }

    showEditor() {
        const editor = document.getElementById("rightpane");
        editor.style.display = "flex";
        this.redraw();
    }

    hideEditor() {
        const editor = document.getElementById("rightpane");
        editor.style.display = "none";
        this.redraw();
    }

    toggleShown() {
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
            this.netgraph.onresize();
        }
        viewport.onresize();
    }
}
