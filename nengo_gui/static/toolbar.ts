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
import { dom, h, VNode } from "maquette";

import "./toolbar.css";

import { config } from "./config";
import { Menu } from "./menu";
import { AlertDialogView, InputDialogView } from "./modal";
import { Connection } from "./server";
import { SimControl } from "./sim-control";
import * as utils from "./utils";

export class Toolbar {
    view = new ToolbarView();

    private server: Connection;

    constructor(server: Connection) {
        this.server = server;
        this.server.bind("toolbar.filename", ({ filename }) => {
            this.filename = filename;
        });

        this.view.buttons["open"].addEventListener("click", () => {
            if (this.view.is_active("open")) {
                this.view.deactivate("open");
                this.server.dispatch("sidebar.hide");
            } else {
                this.server.dispatch("sidebar.filebrowser");
                this.view.deactivate("utils");
                this.view.activate("open");
            }
        });
        this.view.buttons["utils"].addEventListener("click", () => {
            if (this.view.is_active("utils")) {
                this.view.deactivate("utils");
                this.server.dispatch("sidebar.hide");
            } else {
                this.server.dispatch("sidebar.utilities");
                this.view.deactivate("open");
                this.view.activate("utils");
            }
        });
        this.view.buttons["reset"].addEventListener("click", () => {
            this.askResetLayout();
        });
        this.view.buttons["undo"].addEventListener("click", () => {
            this.server.dispatch("netgraph.undo");
            // this.netgraph.notify({undo: "1"});
        });
        this.view.buttons["redo"].addEventListener("click", () => {
            this.server.dispatch("netgraph.redo");
            // this.netgraph.notify({undo: "0"});
        });
        this.view.buttons["filename"].addEventListener("click", () => {
            this.askSaveAs();
        });
        this.view.buttons["sync"].addEventListener("click", () => {
            this.server.dispatch("editor.syncWithServer");
        });
        this.view.buttons["save"].addEventListener("click", () => {
            this.server.dispatch("editor.save");
        });
        this.view.buttons["fontDown"].addEventListener("click", () => {
            this.server.dispatch("editor.fontDown");
        });
        this.view.buttons["fontUp"].addEventListener("click", () => {
            this.server.dispatch("editor.fontUp");
        });
        this.view.buttons["editor"].addEventListener("click", () => {
            this.server.dispatch("editor.toggle");
        });
        this.view.buttons["hotkeys"].addEventListener("click", () => {
            // TODO: hotkeys menu func
            this.server.dispatch("hotkeys.show");
        });

        interact(this.view.root).on("tap", () => {
            Menu.hideShown();
        });

        // document.addEventListener("nengo.editor", (event: CustomEvent) => {
        //     const hidden = event.detail;
        // });
        document.addEventListener("nengo.editor.dirty", () => {
            this.view.enable("sync");
            this.view.enable("save");
        });

        document.addEventListener("nengo.editor.saved", () => {
            this.view.disable("sync");
            this.view.disable("save");
        });

        document.addEventListener("nengoConfigChange", (event: CustomEvent) => {
            const key = event.detail;
            if (key === "editorFontSize") {
                if (config.editorFontSize <= 6) {
                    this.view.disable("fontDown");
                } else {
                    this.view.enable("fontDown");
                }
            }
        });
    }

    get filename(): string {
        return this.view.filename;
    }

    set filename(val: string) {
        const old_filename = this.view.filename;
        if (val !== old_filename) {
            this.view.filename = val;
            // Update the URL so reload and bookmarks work as expected
            history.pushState({}, val, `/?filename=${val}`);
        }
    }

    /**
     * Determines which tab should be in view when clicked.
     *
     * @param {HTMLElement|string} it - The element
     * @param {number} posNum - Which tab it corresponds to
     * @param {boolean} closeIfSelected - Whether to close the tab
     * @returns {function} Function to call on tab click
     */
    // TODO: Move to toolbar
    // menuTabClick(it, posNum, closeIfSelected) {
    //     return () => {
    //         if ($(it).hasClass("deactivated")) {
    //             return;
    //         }
    //         if (closeIfSelected
    //                 && this.menuOpen
    //                 && $(it).hasClass("selected")) {
    //             this.hideSideNav();
    //             this.focusReset();
    //         } else {
    //             this.showSideNav();
    //             const element = document.getElementById("MenuContent");
    //             const transVal = String(-this.view.width * posNum);
    //             element.style.transform = "translate(" + transVal + "px)";
    //             this.focusReset();
    //             $(it).addClass("selected");
    //         }
    //     };
    // }

    askResetLayout() {
        const modal = new AlertDialogView(
            "This operation cannot be undone!",
            "danger"
        );
        modal.title =
            "Are you sure you wish to reset this layout, " +
            "removing all the graphs and resetting the position of all items?";
        const resetButton = modal.addFooterButton("Reset");
        modal.addCloseButton();
        resetButton.addEventListener("click", () => {
            this.resetModelLayout();
        });
        $(modal.root).on("hidden.bs.modal", () => {
            document.body.removeChild(modal.root);
        });
        document.body.appendChild(modal.root);
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
        $(modal.root).on("hidden.bs.modal", () => {
            document.body.removeChild(modal.root);
        });
        document.body.appendChild(modal.root);
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
}

export class ToolbarView {
    buttons: { [name: string]: HTMLAnchorElement | HTMLLIElement };
    root: HTMLElement;
    private ul: HTMLUListElement;

    constructor() {
        const node = h("div.toolbar", [h("ul.nav.nav-pills")]);
        this.root = dom.create(node).domNode as HTMLElement;
        this.ul = this.root.querySelector("ul") as HTMLUListElement;

        this.buttons = {
            open: this.addButton("Open file", "folder-open", "left"),
            utils: this.addButton("Utilities", "wrench", "left"),
            reset: this.addButton("Reset model layout", "trash", "left"),
            undo: this.addButton("Undo", "share-alt.reversed", "left"),
            redo: this.addButton("Redo", "share-alt", "left"),
            leftSpace: this.addSpacer("left"),
            filename: this.addButton("Filename", null, "center"),
            rightSpace: this.addSpacer("right"),
            sync: this.addButton("Sync code", "circle-arrow-left", "right"),
            save: this.addButton("Save file", "floppy-save", "right"),
            fontDown: this.addButton("Decrease font size", "zoom-out", "right"),
            fontUp: this.addButton("Increase font size", "zoom-in", "right"),
            editor: this.addButton("Open code editor", "list-alt", "right"),
            hotkeys: this.addButton("Hotkey list", "question-sign", "right")
        };
    }

    get filename(): string {
        return this.buttons["filename"].textContent;
    }

    set filename(val: string) {
        this.buttons["filename"].textContent = val;
    }

    activate(button: string) {
        const li = this.buttons[button].parentNode as HTMLLIElement;
        li.classList.add("selected");
    }

    is_active(button: string) {
        const li = this.buttons[button].parentNode as HTMLLIElement;
        return li.classList.contains("selected");
    }

    is_enabled(button: string) {
        const li = this.buttons[button].parentNode as HTMLLIElement;
        return !li.classList.contains("disabled");
    }

    deactivate(button: string) {
        const li = this.buttons[button].parentNode as HTMLLIElement;
        li.classList.remove("selected");
    }

    disable(button: string) {
        const li = this.buttons[button].parentNode as HTMLLIElement;
        li.classList.add("disabled");
    }

    enable(button: string) {
        const li = this.buttons[button].parentNode as HTMLLIElement;
        li.classList.remove("disabled");
    }

    addButton(
        title: string,
        icon: string | null,
        align: "left" | "center" | "right"
    ): HTMLAnchorElement {
        const aClass = icon === null ? "" : ".glyphicon.glyphicon-" + icon;
        const node = h("li." + align, [h("a" + aClass, { title: title })]);
        const button = dom.create(node).domNode;
        this.ul.appendChild(button);
        return button.firstChild as HTMLAnchorElement;
    }

    addSpacer(align: "left" | "right"): HTMLLIElement {
        const node = h("li.spacer." + align);
        const spacer = dom.create(node).domNode as HTMLLIElement;
        this.ul.appendChild(spacer);
        return spacer;
    }
}
