import { dom, h, VNode } from "maquette";

import "./toolbar.css";

export class ToolbarView {
    buttons: {[name: string]: HTMLAnchorElement | HTMLLIElement};
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
            hotkeys: this.addButton("Hotkey list", "question-sign", "right"),
        };
        this.filename = "filename";
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
        align: "left" | "center" | "right",
    ): HTMLAnchorElement {
        const aClass = icon === null ? "" : ".glyphicon.glyphicon-" + icon;
        const node = h("li." + align, [h("a" + aClass, {title: title})]);
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
