import { VNode, dom, h } from "maquette";

import "./sim_control.css";
import { set_transform } from "./views";

function button(id: string, icon: string): VNode {
    return h("button.btn.btn-default." + id + "-button", [
        h("span.glyphicon.glyphicon-" + icon),
    ]);
}

export class SimControlView {
    id: string;
    node: VNode;
    root: Element;
    private pause: HTMLElement;
    private rate: Element;
    private reset: HTMLElement;
    private shownTime: Element;
    private ticks: Element;
    private timeSlider: Element;
    private throttle: Element;
    private throttleHandle: Element;
    private _pauseIcon: Element;

    constructor(id: string = "sim-control") {
        this.id = id;
        this.node =
            h("div.sim-control#" + this.id, [
                button("reset", "fast-backward"),
                h("div.time-slider", {styles: {
                    "transform": "translate(200px,10px)",
                    "webkitTransform": "translate(200px,10px)",
                }}, [
                    h("div.shown-time"),
                    h("svg", {
                        height: "100%",
                        style: "pointer-events: none; position: absolute;",
                        width: "100%",
                    }),
                ]),
                button("pause", "play"),
                h("div.time-table", [
                    h("div.speed-throttle", [
                        h("div.guideline"),
                        h("div.btn.btn-default.speed-handle", [""]),
                    ]),
                    h("table.table.metrics-container", [
                        h("tbody", [
                            h("tr.rate-row", [h("td"), h("td")]),
                            h("tr.ticks-row", [h("td"), h("td")]),
                        ]),
                    ]),
                ]),
            ]);

        this.root = dom.create(this.node).domNode;

        // Get handles to buttons
        this.pause = this.root.querySelector(".pause-button") as HTMLElement;
        this._pauseIcon = this.pause.querySelector("span");

        this.reset = this.root.querySelector(".reset-button") as HTMLElement;

        // Get handles to simulation rate elements
        this.rate = this.root.querySelector(".rate-row");
        this.throttle = this.root.querySelector(".speed-throttle");
        this.throttleHandle = this.root.querySelector(".speed-handle");
        this.ticks = this.root.querySelector(".ticks-row");

        // Get handles to time slider elements
        this.shownTime = this.root.querySelector(".shown-time");
        this.timeSlider = this.root.querySelector(".time-slider");
    }

    get pauseIcon(): string {
        // Note: assuming the second class is always glyphicon-icon
        return this._pauseIcon.classList[1].slice(10);
    }

    set pauseIcon(icon: string) {
        const spin = this.spinPause ? " glyphicon-spin" : "";
        this._pauseIcon.className = "glyphicon glyphicon-" + icon + spin;
    }

    get spinPause(): boolean {
        return this._pauseIcon.classList.contains("glyphicon-spin");
    }

    set spinPause(spin: boolean) {
        if (spin) {
            this.pause.setAttribute("disabled", "true");
            this._pauseIcon.classList.add("glyphicon-spin");
        } else {
            this.pause.removeAttribute("disabled");
            this._pauseIcon.classList.remove("glyphicon-spin");
        }
    }

    redraw(): void {
        set_transform(this.pause, this.root.clientWidth - 100, 30);
        set_transform(this.reset, 110, 30);
    }
}
