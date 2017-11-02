import * as $ from "jquery";
import { VNode, dom, h } from "maquette";

import "./editor.css";
import * as utils from "../utils";
import * as views from "./views";

export class EditorView {
    console: HTMLDivElement;
    editor: HTMLDivElement
    root: HTMLDivElement;
    private _stderr: HTMLPreElement;
    private _stdout: HTMLPreElement;

    constructor() {
        const node =
            h("div.editor-container", [
                h("div.editor"),
                h("div.console", [
                    h("pre.stdout"),
                    h("pre.stderr"),
                ]),
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
