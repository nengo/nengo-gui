import { VNode, dom, h } from "maquette";

class VMiddle {
    node: VNode;
    root: HTMLElement;

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
                                h("span", {"aria-hidden": "true"}, ["&times;"]),
                            ]),
                            h("h4.modal-title"),
                        ]),
                        h("div.modal-body"),
                        h("div.modal-footer"),
                    ]),
                ]),
            ]);

        this.root = dom.create(this.node).domNode as HTMLElement;
    }
}
