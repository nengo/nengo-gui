import { VNode, dom, h } from "maquette";

import "./sim-control.css";
import { getTranslate, setTranslate } from "./views";

function button(id: string, icon: string): VNode {
    return h("button.btn.btn-default." + id + "-button", [
        h("span.glyphicon.glyphicon-" + icon),
    ]);
}

export class SimControlView {
    id: string;
    root: HTMLDivElement;
    pause: HTMLButtonElement;
    reset: HTMLButtonElement;
    speedThrottle: SpeedThrottleView = new SpeedThrottleView();
    timeSlider: TimeSliderView = new TimeSliderView();
    private _pauseIcon: HTMLSpanElement;

    constructor(id: string = "sim-control") {
        this.id = id;
        const node =
            h("div.sim-control#" + this.id, [
                button("reset", "fast-backward"),
                button("pause", "play"),
            ]);
        this.root = dom.create(node).domNode as HTMLDivElement;

        this.reset =
            this.root.querySelector(".reset-button") as HTMLButtonElement;
        this.pause =
            this.root.querySelector(".pause-button") as HTMLButtonElement;
        this._pauseIcon = this.pause.querySelector("span") as HTMLSpanElement;
        this.root.appendChild(this.timeSlider.root);
        this.root.appendChild(this.speedThrottle.root);
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

    get height(): number {
        return this.root.clientHeight;
    }

    set height(val: number) {
        this.root.style.height = String(val);
    }

    get width(): number {
        return this.root.clientWidth;
    }

    set width(val: number) {
        this.root.style.width = String(val);
    }
}

export class SpeedThrottleView {
    root: HTMLDivElement;
    handle: HTMLDivElement;
    private slider: HTMLDivElement;
    private ticks: HTMLTableRowElement;
    private _speed: HTMLTableRowElement;
    private _time: HTMLTableRowElement;

    constructor() {
        const node =
            h("div.speed-throttle", [
                h("div.slider", [
                    h("div.guideline"),
                    h("div.btn.btn-default.handle", [""]),
                ]),
                h("table.table", [
                    h("tbody", [
                        h("tr.speed", [
                            h("th.text-center", ["Speed"]),
                            h("td.digits", ["0"]),
                            h("td.text-center", ["."]),
                            h("td.text-left", ["00x"]),
                        ]),
                        h("tr.time", [
                            h("th.text-center", ["Time"]),
                            h("td.digits", ["0"]),
                            h("td.text-center", ["."]),
                            h("td.text-left", ["000"]),
                        ]),
                    ]),
                ]),
            ]);
        this.root = dom.create(node).domNode as HTMLDivElement;

        this._speed = this.root.querySelector(".speed") as HTMLTableRowElement;
        this.slider = this.root.querySelector(".slider") as HTMLDivElement;
        this.handle = this.slider.querySelector(".handle") as HTMLDivElement;
        this._time = this.root.querySelector(".time") as HTMLTableRowElement;
        this.ticks =
            this.root.querySelector(".ticks-row") as HTMLTableRowElement;
    }

    get sliderPosition(): number {
        return Number(this.handle.style.left.replace("px", ""));
    }

    set sliderPosition(val: number) {
        this.handle.style.left = String(val) + "px";
    }

    get sliderWidth(): number {
        return this.slider.clientWidth;
    }

    get speed(): number {
        return Number(
            this._speed.children[1].textContent +
                "." +
                this._speed.children[3].textContent.slice(0, -1)
        );
    }

    set speed(val: number) {
        this._speed.children[1].textContent = val.toFixed(0);
        this._speed.children[3].textContent =
            (val % 1).toFixed(2).slice(2) + "x";
    }

    get time(): number {
        return Number(
            this._time.children[1].textContent +
                "." +
                this._time.children[3].textContent
        );
    }

    set time(val: number) {
        this._time.children[1].textContent = val.toFixed(0);
        this._time.children[3].textContent = (val % 1).toFixed(3).slice(2);
    }
}

export class TimeSliderView {
    axis: SVGGElement;
    root: HTMLDivElement;
    shownTime: SVGGElement;
    private svg: SVGSVGElement;

    constructor() {
        const [width, height] = [200, 57];
        const node =
            h("div.time-slider", [
                h("svg", {
                    preserveAspectRatio: "xMinYMin",
                    viewBox: `0 0 ${width} ${height}`,
                }, [
                    h("g.shown-time", {
                        transform: "translate(0,0)",
                    }, [
                        h("rect", {
                            height: `${height}`,
                            width: `${height}`,
                            x: "0",
                            y: "0",
                        }),
                        h("line.shown-time-border#left", {
                            x1: "0",
                            x2: "0",
                            y1: "0",
                            y2: `${height}`,
                        }),
                        h("line.shown-time-border#right", {
                            x1: `${height}`,
                            x2: `${height}`,
                            y1: "0",
                            y2: `${height}`,
                        }),
                    ]),
                    h("g.axis", {
                        transform: `translate(0,${height / 2})`,
                    }),
                ]),
            ]);
        this.root = dom.create(node).domNode as HTMLDivElement;
        this.svg = this.root.querySelector("svg") as SVGSVGElement;
        this.shownTime = this.svg.querySelector("g.shown-time") as SVGGElement;
        this.axis = this.svg.querySelector("g.axis") as SVGGElement;
    }

    get height(): number {
        return this.root.clientHeight;
    }

    set height(val: number) {
        this.root.style.height = `${val}`;
    }

    /**
     * Offset of the shownTime rect in pixels.
     */
    get shownOffset(): number {
        const [x, y] = getTranslate(this.shownTime);
        console.assert(y === 0);
        return x;
    }

    set shownOffset(val: number) {
        setTranslate(this.shownTime, val, 0);
    }

    get shownWidth(): number {
        const rect = this.svg.querySelector("rect") as SVGRectElement;
        return rect.width.baseVal.value;
    }

    set shownWidth(val: number) {
        const rect = this.svg.querySelector("rect") as SVGRectElement;
        const right = this.svg.getElementById("right") as SVGLineElement;
        rect.width.baseVal.value = val;
        right.x1.baseVal.value = val;
        right.x2.baseVal.value = val;
    }

    get svgLeft(): number {
        return this.svg.getBoundingClientRect().left;
    }

    get svgWidth(): number {
        return this.svg.getBoundingClientRect().width;
    }

    get width(): number {
        return this.root.clientWidth;
    }
}
