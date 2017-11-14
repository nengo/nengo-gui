import * as $ from "jquery";
import { VNode, dom, h } from "maquette";

import "./modal.css";

import * as utils from "./utils";

export class Modal {
    $body;
    $div;
    $footer;
    $title;
    editor;
    hotkeys;
    netgraph;
    sim;
    simWasRunning;
    toolbar;
    view: ModalView = null; // Created in this.show

    constructor($div, editor, sim) {
        // this.$div = $div;
        // this.$title = this.$div.find(".modal-title").first();
        // this.$footer = this.$div.find(".modal-footer").first();
        // this.$body = this.$div.find(".modal-body").first();
        this.editor = editor;
        this.sim = sim;
        this.netgraph = this.editor.netgraph;

        this.simWasRunning = false;

        // This listener is triggered when the modal is closed
        this.$div.on("hidden.bs.modal", function() {
            if (this.simWasRunning) {
                this.sim.play();
            }
            this.hotkeys.setActive(true);
        });
    }

    show() {
        // TODO: get the hotkeys and deactivate
        // this.hotkeys.setActive(false);
        this.simWasRunning = !this.sim.paused;
        this.sim.pause();
        this.view = new ModalView();
        this.view.show();
    }
}

export class ModalView {
    body: HTMLDivElement;
    dialog: HTMLDivElement;
    footer: HTMLDivElement;
    root: HTMLDivElement;
    _title: HTMLHeadingElement;

    constructor() {
        const node = h("div.modal.fade", [
            h("div.modal-dialog", [
                h("div.modal-content", [
                    h("div.modal-header", [
                        h(
                            "button.close",
                            {
                                type: "button",
                                "data-dismiss": "modal",
                                "aria-label": "Close"
                            },
                            [h("span", { "aria-hidden": "true" }, ["×"])]
                        ),
                        h("h4.modal-title")
                    ]),
                    h("div.modal-body"),
                    h("div.modal-footer")
                ])
            ])
        ]);

        this.root = dom.create(node).domNode as HTMLDivElement;
        this.dialog = this.root.querySelector(
            ".modal-dialog"
        ) as HTMLDivElement;
        this._title = this.root.querySelector(
            ".modal-title"
        ) as HTMLHeadingElement;
        this.footer = this.root.querySelector(
            ".modal-footer"
        ) as HTMLDivElement;
        this.body = this.root.querySelector(".modal-body") as HTMLDivElement;
    }

    get title(): string {
        return this._title.textContent;
    }

    set title(title: string) {
        this._title.textContent = title;
    }

    addFooterButton(
        label: string,
        style: string = "primary"
    ): HTMLButtonElement {
        const node = h("button.btn.btn-" + style, { type: "button" }, [label]);
        const button = dom.create(node).domNode;
        this.footer.appendChild(button);
        return button as HTMLButtonElement;
    }

    addCloseButton(label: string = "Close"): HTMLButtonElement {
        const button = this.addFooterButton(label, "default");
        button.setAttribute("data-dismiss", "modal");
        return button;
    }

    hide() {
        $(this.root).modal("hide");
    }

    show() {
        $(this.root).modal("show");
    }
}

export class AlertDialogView extends ModalView {
    close: HTMLButtonElement;

    constructor(text: string, level: utils.AlertLevel = "info") {
        super();
        this.body.appendChild(dom.create(utils.bsAlert(text, level)).domNode);
        this.close = this.addCloseButton();
    }
}

export class InputDialogView extends ModalView {
    cancel: HTMLButtonElement;
    form: HTMLFormElement;
    input: HTMLInputElement;
    ok: HTMLButtonElement;

    constructor(initialValues: string, label: string, errorText: string = "") {
        super();
        const node = h("form.form-horizontal", [
            h("div.form-group", [
                h("div.controls", [
                    h("label.control-label", [
                        label,
                        h("input", {
                            "data-error": errorText,
                            "data-ngvalidator": "custom",
                            placeholder: initialValues,
                            type: "text"
                        })
                    ]),
                    h("div.help-block.with-errors")
                ])
            ])
        ]);

        this.form = dom.create(node).domNode as HTMLFormElement;
        this.body.appendChild(this.form);
        this.input = this.body.querySelector("input") as HTMLInputElement;
        this.cancel = this.addCloseButton("Cancel");
        this.ok = this.addFooterButton("OK");

        // Prevent enter from submitting the form
        this.form.onsubmit = () => false;
    }

    show() {
        $(this.root).modal("show");
        $(this.root).on("shown.bs.modal", () => {
            this.input.focus();
        });
    }
}

// Change the global defaults of the modal validator
if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
        const validator = (<any>$.fn.validator).Constructor.DEFAULTS;
        // Change the delay before showing errors
        validator.delay = 5000;
        // Leave the ok button on
        validator.disable = false;
        // Set the error messages for new validators
        validator.errors = { ngvalidator: "Does not match" };
    });
}
