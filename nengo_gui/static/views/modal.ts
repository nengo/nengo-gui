import * as $ from "jquery";
import { VNode, dom, h } from "maquette";

export class ModalView {
    body: HTMLDivElement;
    footer: HTMLDivElement;
    node: VNode;
    root: HTMLDivElement;
    _title: HTMLHeadingElement;

    constructor() {
        this.node =
            h("div.modal.fade", [
                h("div.modal-dialog", [
                    h("div.modal-content", [
                        h("div.modal-header", [
                            h("button.close", {
                                "type": "button",
                                "data-dismiss": "modal",
                                "aria-label": "Close",
                            }, [
                                h("span", {"aria-hidden": "true"}, ["×"]),
                            ]),
                            h("h4.modal-title"),
                        ]),
                        h("div.modal-body"),
                        h("div.modal-footer"),
                    ]),
                ]),
            ]);

        this.root = dom.create(this.node).domNode as HTMLDivElement;
        this._title =
            this.root.querySelector(".modal-title") as HTMLHeadingElement;
        this.footer =
            this.root.querySelector(".modal-footer") as HTMLDivElement;
        this.body = this.root.querySelector(".modal-body") as HTMLDivElement;
    }

    get title(): string {
        return this._title.textContent;
    }

    set title(title: string) {
        this._title.textContent = title;
    }

    show() {
        $(this.root).modal();
    }
}
