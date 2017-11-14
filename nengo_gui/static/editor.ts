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
import { VNode, dom, h } from "maquette";

import "./editor.css";

import { config } from "./config";
import { HotkeyManager } from "./hotkeys";
import { Connection } from "./server";
import * as utils from "./utils";

const Range = ace.acequire("ace/range").Range;

export class Editor {
    consoleInteract;
    currentCode;
    editor;
    marker = null;
    interactConsole;
    interactEditor;
    saveDisabled: boolean = true;
    syncIntervalID: number = null;
    view = new EditorView();

    private server: Connection;

    constructor(server: Connection) {
        this.currentCode = "";

        // Set up Ace editor
        this.editor = ace.edit(this.view.editor);
        this.editor.getSession().setMode("ace/mode/python");
        this.editor.gotoLine(1);
        this.editor.setFontSize(this.fontSize);
        this.view.consoleHeight = this.consoleHeight;
        this.view.width = this.width;

        // Sync with server every 200 ms
        if (this.autoUpdate) {
            this.syncIntervalID = window.setInterval(() => {
                this.syncWithServer();
            }, 200);
        }

        // Add event handlers
        window.addEventListener("resize", () => {
            this.onresize();
        });

        this.interactEditor = interact(this.view.editor);
        this.interactEditor.resizable({
            edges: { bottom: false, left: true, right: false, top: false }
        });
        this.interactEditor.on("resizestart", event => {
            this.view.root.style.transition = "none";
        });
        this.interactEditor.on("resizemove", event => {
            this.view.width -= event.deltaRect.left;
            this.editor.resize();
        });
        this.interactEditor.on("resizeend", event => {
            this.width = this.view.width;
            this.view.root.style.transition = null;
        });

        this.interactConsole = interact(this.view.console);
        this.interactConsole.resizable({
            edges: { bottom: false, left: true, right: false, top: true }
        });
        this.interactConsole.on("resizestart", event => {
            this.view.root.style.transition = "none";
        });
        this.interactConsole.on("resizemove", event => {
            this.view.width -= event.deltaRect.left;
            this.view.consoleHeight -= event.deltaRect.top;
            this.editor.resize();
        });
        this.interactConsole.on("resizeend", event => {
            this.width = this.view.width;
            this.consoleHeight = this.view.consoleHeight;
            this.view.root.style.transition = null;
        });

        // Add config change handlers
        document.addEventListener("nengoConfigChange", (event: CustomEvent) => {
            const key = event.detail;
            if (key === "editorWidth") {
                this.view.width = this.width;
                this.editor.resize();
            } else if (key === "consoleHeight") {
                this.view.consoleHeight = this.consoleHeight;
            } else if (key === "hideEditor") {
                this.view.hidden = this.hidden;
            } else if (key === "editorFontSize") {
                this.editor.setFontSize(this.fontSize);
            } else if (key === "autoUpdate") {
                if (this.autoUpdate && this.syncIntervalID === null) {
                    this.syncIntervalID = window.setInterval(() => {
                        this.syncWithServer();
                    }, 200);
                } else if (!this.autoUpdate && this.syncIntervalID !== null) {
                    window.clearInterval(this.syncIntervalID);
                    this.syncIntervalID = null;
                }
            }
        });

        // Add server-callables
        server.bind("editor.code", ({ code }) => {
            if (code !== null) {
                this.editor.setValue(code);
                this.currentCode = code;
                this.editor.gotoLine(1);
                // TODO: only when set by server
                document.dispatchEvent(new Event("nengo.editor.saved"));
            }
        });

        server.bind("editor.filename", ({ filename, error }) => {
            if (error === null) {
                document.getElementById("filename")[0].innerHTML = filename;
                // Update the URL so reload and bookmarks work as expected
                history.pushState({}, filename, "/?filename=" + filename);
            } else {
                alert(error); // TODO: modal instead of alert
            }
        });

        server.bind("editor.save", () => {
            this.saveFile();
        });

        server.bind("editor.stderr", ({ output, line }) => {
            const session = this.editor.getSession();

            if (output == null) {
                // Clear errors
                if (this.marker !== null) {
                    session.removeMarker(this.marker);
                    session.clearAnnotations();
                    this.marker = null;
                }
                this.view.stderr = "";
            } else {
                if (line == null) {
                    line = session.getLength() - 1;
                }
                this.marker = session.addMarker(
                    new Range(line - 1, 0, line - 1, 10),
                    "highlight",
                    "fullLine",
                    true
                );
                session.setAnnotations([
                    {
                        row: line - 1,
                        text: output
                            .split("\n")
                            .slice(-2)
                            .join("\n"),
                        type: "error"
                    }
                ]);
                this.view.stderr = output;
                this.view.console.scrollTop = this.view.console.scrollHeight;
            }
        });

        server.bind("editor.stdout", ({ output, line }) => {
            console.assert(line == null);
            this.view.stdout = output;
            this.view.console.scrollTop = this.view.console.scrollHeight;
        });

        server.bind("editor.syncWithServer", () => {
            this.syncWithServer();
        });

        server.bind("editor.fontDown", () => {
            this.fontSize -= 1;
        });

        server.bind("editor.fontUp", () => {
            this.fontSize += 1;
        });

        server.bind("editor.toggle", () => {
            this.toggleHidden();
        });

        this.editor.on("change", () => {
            document.dispatchEvent(new Event("nengo.editor.dirty"));
        });

        this.view.editor.addEventListener("saved", () => {
            document.dispatchEvent(new Event("nengo.editor.saved"));
        });

        server.send("editor.sync");

        this.server = server;
        this.onresize();
    }

    // Automatically update the model based on the text
    get autoUpdate(): boolean {
        return config.autoUpdate;
    }

    set autoUpdate(val: boolean) {
        config.autoUpdate = val;
    }

    get editorCode(): string {
        return this.editor.getValue();
    }

    get consoleHeight(): number {
        return config.consoleHeight;
    }

    set consoleHeight(val: number) {
        config.consoleHeight = val;
    }

    get fontSize(): number {
        return config.editorFontSize;
    }

    set fontSize(val: number) {
        config.editorFontSize = val;
    }

    get hidden(): boolean {
        return config.hideEditor;
    }

    set hidden(val: boolean) {
        config.hideEditor = val;
    }

    get width(): number {
        return config.editorWidth;
    }

    set width(val: number) {
        config.editorWidth = val;
    }

    hotkeys(manager: HotkeyManager) {
        manager.add("Toggle editor", "e", { ctrl: true }, () => {
            this.toggleHidden();
        });
        manager.add("Save", "s", { ctrl: true }, () => {
            this.saveFile();
        });
        // TODO: pick better shortcuts
        manager.add(
            "Toggle auto-update",
            "1",
            { ctrl: true, shift: true },
            () => {
                this.autoUpdate = !this.autoUpdate;
            }
        );
        manager.add("Update display", "1", { ctrl: true }, () => {
            this.syncWithServer();
        });
    }

    onresize = utils.throttle(() => {
        [this.interactConsole, this.interactEditor].forEach(i => {
            i.resizable({
                restrict: {
                    restriction: {
                        bottom: this.view.bottom - 20,
                        left: 250,
                        right: window.innerWidth - 100,
                        top: this.view.top + 40
                    }
                }
            });
        });
        this.editor.resize();
    }, 33); // 33 = 30 FPS update

    saveFile() {
        this.syncWithServer(true);
    }

    // syncWithServer called at most once per 150 ms
    syncWithServer = utils.throttle((save: boolean = false) => {
        if (this.editorCode !== this.currentCode) {
            // TODO: figure out what to do with this...
            // this.server.send("editor.set_code",
            // this.ws.send(JSON.stringify({ code: this.editorCode, save }));
            this.currentCode = this.editorCode;
            this.view.editor.dispatchEvent(new Event("saved"));
        }
    }, 150);

    toggleHidden() {
        this.hidden = !this.hidden;
        // document.dispatchEvent(new CustomEvent("nengo.editor", {
        //     detail: this.hidden,
        // }));
    }
}

export class EditorView {
    console: HTMLDivElement;
    editor: HTMLDivElement;
    root: HTMLDivElement;
    private _stderr: HTMLPreElement;
    private _stdout: HTMLPreElement;

    constructor() {
        const node = h("div.editor-container", [
            h("div.editor"),
            h("div.console", [h("pre.stdout"), h("pre.stderr")])
        ]);

        this.root = dom.create(node).domNode as HTMLDivElement;
        this.editor = this.root.querySelector(".editor") as HTMLDivElement;
        this.console = this.root.querySelector(".console") as HTMLDivElement;
        this._stderr = this.console.querySelector(".stderr") as HTMLPreElement;
        this._stdout = this.console.querySelector(".stdout") as HTMLPreElement;
    }

    get consoleHeight(): number {
        return this.console.offsetHeight;
    }

    set consoleHeight(val: number) {
        // TODO: probably these heights are not the same
        this.console.style.height = val + "px";
    }

    get bottom(): number {
        return this.root.getBoundingClientRect().bottom;
    }

    get height(): number {
        return this.root.offsetHeight;
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

    get maxWidth(): number {
        const parent = this.root.parentNode as HTMLDivElement;
        // 250 gives room for sidebar, but still somewhat arbitrary
        return Math.max(580, parent.clientWidth - 250);
    }

    get stderr(): string {
        return this._stderr.textContent;
    }

    set stderr(val: string) {
        this._stderr.textContent = val;
    }

    get stdout(): string {
        return this._stdout.textContent;
    }

    set stdout(val: string) {
        this._stdout.textContent = val;
    }

    get top(): number {
        return this.root.getBoundingClientRect().top;
    }

    get width(): number {
        return this.root.clientWidth;
    }

    set width(val: number) {
        this.root.style.width = `${val}px`;
    }
}
