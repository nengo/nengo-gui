import * as d3 from "d3";
import * as interact from "interact.js";

import { VNode, dom, h } from "maquette";

import "./sim-control.css";

import { HotkeyManager } from "./hotkeys";
import { AlertDialogView } from "./modal";
import { Connection, FastConnection, FastServerConnection } from "./server";
import * as utils from "./utils";

/**
 * Control panel for a simulation.
 */
export class SimControl {
    simulatorOptions: string = "";
    speedThrottle: SpeedThrottle;
    timeSlider: TimeSlider;
    view: SimControlView;
    /**
     * WebSocket to communicate with the server.
     */
    ws: FastServerConnection;

    private _status: string = "paused";
    private fastServer: FastConnection;
    private server: Connection;

    /**
     * Groups elements that control a simulation.
     *
     * Specifically, the SimControl contains a speed throttle, a reset button,
     * a time slider, and a play/pause button.
     *
     * @param uid - Unique identifier.
     * @param keptTime - How much time the time slider should keep.
     * @param shownTime - How much time the time slider should show.
     */
    constructor(
        server: Connection,
        keptTime = 4.0,
        shownTime: [number, number] = [-0.5, 0.0]
    ) {
        this.view = new SimControlView("sim-control");
        this.timeSlider = new TimeSlider(
            keptTime,
            shownTime,
            this.view.timeSlider
        );
        this.speedThrottle = new SpeedThrottle(this.view.speedThrottle);

        this.view.pause.onclick = event => {
            this.togglePlaying();
        };

        this.view.pause.onkeydown = event => {
            const key = event.key || String.fromCharCode(event.keyCode);
            if (key === " ") {
                event.stopPropagation();
            }
        };

        this.view.reset.onclick = event => {
            this.timeSlider.reset();
        };

        this.fastServer = new FastServerConnection();
        this.fastServer.bind((data: ArrayBuffer) => {
            const view = new Float64Array(data);
            this.timeSlider.addTime(view[0]);
            this.speedThrottle.time = view[0];
        });

        // this.ws = new FastServerConnection(
        //     "simcontrol",
        //     (data: ArrayBuffer) => {
        //         // time, speed, proportion
        //         return [data[0], data[1], data[2]];
        //     },
        //     (time: number, speed: number, proportion: number) => {
        //         this.timeSlider.addTime(time);
        //         this.speedThrottle.time = time;
        //         this.speedThrottle.speed = speed;
        //         this.speedThrottle.proportion = proportion;
        //     },
        // );

        server.bind("simcontrol.rate", ({ rate, proportion }) => {
            this.speedThrottle.speed = rate;
            this.speedThrottle.proportion = proportion;
        });

        server.bind("close", event => {
            this.disconnected();
        });
        server.bind("simcontrol.status", ({ status }) => {
            this.status = status;
        });
        server.bind("simcontrol.simulator", ({ simulator }) => {
            this.simulatorOptions = simulator;
        });
        server.bind("simcontrol.config", ({ js }) => {
            // TODO: nooooo
            eval(js);
        });
        this.server = server;
    }

    get paused(): boolean {
        return this._status === "paused";
    }

    get status(): string {
        return this._status;
    }

    set status(val: string) {
        this._status = val.trim();

        let spin = false;
        let icon = "cog";

        if (this._status === "building") {
            spin = true;
        } else if (this._status === "paused") {
            icon = "play";
        } else if (this._status === "running") {
            icon = "pause";
        } else if (this._status === "build_error") {
            icon = "remove";
        } else {
            console.warn(
                "SimControl does not understand status '" + this._status + "'"
            );
        }
        this.view.pauseIcon = icon;
        this.view.spinPause = spin;
    }

    get time(): number {
        return this.speedThrottle.time;
    }

    disconnected() {
        document.body.style.backgroundColor = "#a94442";
        const modal = new AlertDialogView(
            "To continue working with your model, re-run nengo and click Refresh.",
            "danger"
        );
        modal.title = "Nengo has stopped running";
        const refresh = modal.addFooterButton("Refresh");
        $("#refreshButton").on("click", () => {
            location.reload();
        });
        refresh.addEventListener("click", () => {
            location.reload();
        });
        $(modal.root).on("hidden.bs.modal", () => {
            document.body.removeChild(modal.root);
        });
        document.body.appendChild(modal.root);
        modal.show();
        return modal;
    }

    hotkeys(manager: HotkeyManager) {
        manager.add("Play / pause", " ", event => {
            if (!event.repeat) {
                this.togglePlaying();
            }
        });
        manager.add("Play / pause", "enter", { shift: true }, event => {
            if (!event.repeat) {
                this.togglePlaying();
            }
        });
    }

    setBackend(backend: string) {
        this.server.send("simcontrol.set_backend", { backend: backend });
    }

    pause() {
        if (!this.paused) {
            this.server.send("simcontrol.pause");
            // Once paused, simcontrol.status will be set by the server
        } else {
            console.warn("Simulation not running");
        }
    }

    play() {
        if (this.paused) {
            this.server.send("simcontrol.play");
            // Once played, simcontrol.status will be set by the server
        } else {
            console.warn("Simulation already playing");
        }
    }

    /**
     * Informs the backend simulator of the time being reset.
     */
    reset() {
        this.status = "paused";
        this.server.send("simcontrol.reset");
    }

    togglePlaying() {
        if (this.paused) {
            this.play();
        } else {
            this.pause();
        }
    }

    /**
     * Update the visual display.
     */
    // update() {
    //     this.attached.forEach(conn => {
    //         conn.send("simcontrol.proportion", {x: this.speedThrottle.x});
    //     });
    //     this.timeSlider.addTime(this.time);
    // }
}

export class SpeedThrottle {
    manual: boolean = false;
    proportion: number = 0.0;
    /**
     * The most recent speed information from the simulator.
     */
    timeScale: d3.scale.Linear<number, number>;
    view: SpeedThrottleView;

    constructor(view: SpeedThrottleView) {
        this.view = view;
        this.timeScale = d3.scale
            .linear()
            .clamp(true)
            .domain([0, 1.0])
            .range([0, this.view.sliderWidth]);
        this.view.sliderPosition = this.timeScale(1.0);

        interact(this.view.handle).draggable({
            onmove: event => {
                this.x += event.dx;
            },
            onstart: event => {
                this.x = this.view.sliderPosition;
                this.manual = true;
            }
        });
    }

    get speed(): number {
        return this.view.speed;
    }

    set speed(val: number) {
        this.view.speed = val;
    }

    get time(): number {
        return this.view.time;
    }

    set time(val: number) {
        this.view.time = val;
    }

    get x(): number {
        return this.timeScale.invert(this.view.sliderPosition);
    }

    set x(val: number) {
        this.view.sliderPosition = this.timeScale(this.timeScale.invert(val));
    }
}

export class TimeSlider {
    /**
     * Minimum width of the shownTime box in pixels.
     */
    private static minPixelWidth: number = 45;

    /**
     * Most recent time received from simulation.
     */
    currentTime: number = 0.0;

    /**
     * How much total time to store.
     *
     * This is also the width of the TimeSlider in seconds.
     */
    keptTime: number;

    interactable;

    shownTime: [number, number];

    /**
     * View associated with this TimeSlider.
     */
    view: TimeSliderView;

    /**
     * Scale to convert time to offset value (in pixels).
     */
    private keptScale: d3.scale.Linear<number, number>;
    private sliderAxis: d3.svg.Axis;

    constructor(
        keptTime: number = 4.0,
        shownTime: [number, number] = [-1.0, 0.0],
        view: TimeSliderView
    ) {
        this.view = view;
        this.keptTime = keptTime;
        this.shownTime = shownTime;

        this.keptScale = d3.scale.linear().domain([0.0 - this.keptTime, 0.0]);
        this.sliderAxis = d3.svg
            .axis()
            .scale(this.keptScale)
            .orient("bottom")
            .ticks(10);

        // Make the shown time draggable and resizable
        const inBounds = event => {
            const relativeX = event.pageX - this.view.svgLeft;
            return relativeX >= 0 && relativeX <= this.view.svgWidth;
        };
        this.interactable = interact(this.view.shownTime);
        this.interactable.draggable(true);
        this.interactable.resizable({
            edges: { bottom: false, left: true, right: true, top: false }
        });
        this.interactable.on("dragmove", event => {
            if (inBounds(event)) {
                this.moveShown(
                    this.toTime(this.toPixel(this.shownTime[0]) + event.dx)
                );
            }
        });
        this.interactable.on("resizemove", event => {
            if (inBounds(event)) {
                const rect = event.deltaRect;
                this.resizeShown(
                    this.toTime(this.toPixel(this.shownTime[0]) + rect.left),
                    this.toTime(this.toPixel(this.shownTime[1]) + rect.right)
                );
            }
        });

        window.addEventListener("SimControl.reset", event => {
            this.reset();
        });

        window.addEventListener(
            "resize",
            utils.throttle(() => {
                const width = this.view.width;
                this.view.shownWidth = width * this.shownWidth / this.keptTime;
                this.keptScale.range([0, width]);
                this.view.shownOffset = this.toPixel(this.shownTime[0]);
                this.sliderAxis(d3.select(this.view.axis));
            }, 66)
        ); // 66 ms throttle = 15 FPS update
    }

    get firstTime(): number {
        return this.keptScale.domain()[0];
    }

    get isAtEnd(): boolean {
        // TODO: is this really needed?
        return this.currentTime < this.shownTime[1] + 1e-9;
    }

    get shownWidth(): number {
        return this.shownTime[1] - this.shownTime[0];
    }

    /**
     * Update the axis given a new time point from the simulator.
     *
     * @param {number} time - The new time point
     */
    addTime(time) {
        const delta = time - this.currentTime; // Time since last addTime()

        if (delta < 0) {
            window.dispatchEvent(new Event("SimControl.reset"));
            return;
        }
        this.currentTime = time;
        this.moveShown(this.shownTime[0] + delta);

        // Update the limits on the time axis
        this.keptScale.domain([time - this.keptTime, time]);

        // Update the time axis display
        this.sliderAxis(d3.select(this.view.axis));

        // Fire an event so datastores and components can update
        window.dispatchEvent(
            new CustomEvent("TimeSlider.addTime", {
                detail: {
                    currentTime: this.currentTime,
                    keptTime: this.keptTime
                }
            })
        );
    }

    jumpToEnd() {
        this.moveShown(this.currentTime - this.shownWidth);
    }

    moveShown(time: number) {
        time = utils.clip(
            time,
            this.firstTime,
            this.currentTime - this.shownWidth
        );
        this.view.shownOffset = this.toPixel(time);
        const diff = time - this.shownTime[0];
        this.shownTime = [this.shownTime[0] + diff, this.shownTime[1] + diff];

        // Fire an event so datastores and components can update
        window.dispatchEvent(
            new CustomEvent("TimeSlider.shownTime", {
                detail: { shownTime: this.shownTime }
            })
        );
    }

    reset() {
        this.currentTime = 0.0;
        this.jumpToEnd();
        // Update the limits on the time axis
        this.keptScale.domain([
            this.currentTime - this.keptTime,
            this.currentTime
        ]);
        this.sliderAxis(d3.select(this.view.axis));
    }

    resizeShown(startTime: number, endTime: number) {
        startTime = utils.clip(
            startTime,
            this.firstTime,
            this.toTime(
                this.toPixel(this.shownTime[1]) - TimeSlider.minPixelWidth
            )
        );
        endTime = utils.clip(
            endTime,
            this.toTime(this.toPixel(startTime) + TimeSlider.minPixelWidth),
            this.currentTime
        );

        // Update times
        this.shownTime = [startTime, endTime];
        // Adjust width
        this.view.shownWidth = this.toPixel(endTime) - this.toPixel(startTime);
        // Adjust offset
        this.moveShown(startTime);
    }

    toPixel(time: number): number {
        return this.keptScale(time);
    }

    toTime(pixel: number): number {
        return this.keptScale.invert(pixel);
    }
}

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
        const [x, y] = utils.getTranslate(this.shownTime);
        console.assert(y === 0);
        return x;
    }

    set shownOffset(val: number) {
        utils.setTranslate(this.shownTime, val, 0);
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
