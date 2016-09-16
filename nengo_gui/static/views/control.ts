import { VNode, dom, h } from "maquette";

function button(id: string, cls: string, icon: string): VNode {
    return h("button.btn.btn-default." + cls + "-button#" + id + "_button", [
        h("span.glyphicon.glyphicon-" + icon + "#" + id + "_button_icon"),
    ]);
}

class VMiddle {
    node: VNode;
    root: HTMLElement;

    constructor() {
        this.node =
            h("div#control", [
                button("reset", "reset", "fast-backward"),
                h("div.time_slider", [
                    h("div.shown_time"),
                ]),
                button("pause", "play-pause", "play"),
                h("div#time_table", [
                    h("div#speed_throttle"),
                    h("table.table.metrics-container", [
                        h("tbody", [
                            h("tr#rate_tr", [h("td"), h("td")]),
                            h("tr#ticks_tr", [h("td"), h("td")]),
                        ]),
                    ]),
                ]),
            ]);

        this.root = dom.create(this.node).domNode as HTMLElement;
    }
}
