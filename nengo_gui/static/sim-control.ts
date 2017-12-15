import * as d3 from "d3";
import * as interact from "interactjs";

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
     * @param timeKept - How much time the time slider should keep.
     * @param shownTime - How much time the time slider should show.
     */
    constructor(server: Connection, timeKept = 4.0, shownWidth = 0.5) {
        this.view = new SimControlView("sim-control");
        this.timeSlider = new TimeSlider(
            timeKept,
            shownWidth,
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
            this.speedThrottle.speed = view[1];
            this.speedThrottle.proportion = view[2];
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
        const node = h("div.sim-control#" + this.id, [
            button("reset", "fast-backward"),
            button("pause", "play")
        ]);
        this.root = dom.create(node).domNode as HTMLDivElement;

        this.reset = this.root.querySelector(
            ".reset-button"
        ) as HTMLButtonElement;
        this.pause = this.root.querySelector(
            ".pause-button"
        ) as HTMLButtonElement;
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

export class SpeedThrottle {
    manual: boolean = false;
    proportion: number = 0.0;
    /**
     * The most recent speed information from the simulator.
     */
    scale: d3.scale.Linear<number, number>;
    view: SpeedThrottleView;

    constructor(view: SpeedThrottleView) {
        this.view = view;
        this.scale = d3.scale
            .linear()
            .clamp(true)
            .domain([0, 1.0])
            .range([0, this.view.sliderWidth]);
        this.view.sliderPosition = this.scale(1.0);

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
        return this.scale.invert(this.view.sliderPosition);
    }

    set x(val: number) {
        this.view.sliderPosition = this.scale(this.scale.invert(val));
    }
}

function button(id: string, icon: string): VNode {
    return h("button.btn.btn-default." + id + "-button", [
        h("span.glyphicon.glyphicon-" + icon)
    ]);
}

export class SpeedThrottleView {
    root: HTMLDivElement;
    handle: HTMLDivElement;
    private slider: HTMLDivElement;
    private ticks: HTMLTableRowElement;
    private _speed: number = 0;
    private _speedRow: HTMLTableRowElement;
    private _time: number = 0;
    private _timeRow: HTMLTableRowElement;

    constructor() {
        const node = h("div.speed-throttle", [
            h("div.slider", [
                h("div.guideline"),
                h("div.btn.btn-default.handle", [""])
            ]),
            h("table.table", [
                h("tbody", [
                    h("tr.speed", [
                        h("th", ["Speed"]),
                        h("td.whole", ["0"]),
                        h("td.decimal-point", ["."]),
                        h("td.decimal", ["00x"])
                    ]),
                    h("tr.time", [
                        h("th", ["Time"]),
                        h("td.whole", ["0"]),
                        h("td.decimal-point", ["."]),
                        h("td.decimal", ["000"])
                    ])
                ])
            ])
        ]);
        this.root = dom.create(node).domNode as HTMLDivElement;

        this._speedRow = this.root.querySelector(
            ".speed"
        ) as HTMLTableRowElement;
        this.slider = this.root.querySelector(".slider") as HTMLDivElement;
        this.handle = this.slider.querySelector(".handle") as HTMLDivElement;
        this._timeRow = this.root.querySelector(".time") as HTMLTableRowElement;
        this.ticks = this.root.querySelector(
            ".ticks-row"
        ) as HTMLTableRowElement;
    }

    get sliderPosition(): number {
        return parseFloat(this.handle.style.left);
    }

    set sliderPosition(val: number) {
        this.handle.style.left = `${val}px`;
    }

    get sliderWidth(): number {
        return this.slider.clientWidth;
    }

    get speed(): number {
        return this._speed;
    }

    set speed(val: number) {
        this._speed = val;
        this.update();
    }

    get time(): number {
        return this._time;
    }

    set time(val: number) {
        this._time = val;
        this.update();
    }

    // This is called quickly, so we throttle to keep the UI responsive
    update = utils.throttle(() => {
        const speed = utils.toStringParts(this._speed, 2);
        this._speedRow.children[1].textContent = speed[0];
        this._speedRow.children[3].textContent = `${speed[1]}x`;

        const time = utils.toStringParts(this._time, 3);
        this._timeRow.children[1].textContent = time[0];
        this._timeRow.children[3].textContent = time[1];
    }, 50);
}

export class TimeSlider {
    private static minPixelWidth: number = 45;

    interactable;
    keptWidth: number;
    shownWidth: number;

    timeCurrent: number = 0.0;
    timeShown: number = 0.0;

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
        keptWidth: number = 4.0,
        shownWidth: number = 1.0,
        view: TimeSliderView
    ) {
        this.view = view;
        this.keptWidth = keptWidth;
        this.shownWidth = shownWidth;

        this.keptScale = d3.scale
            .linear()
            .domain([this.timeCurrent - this.keptWidth, this.timeCurrent]);
        this.sliderAxis = d3.svg
            .axis()
            .scale(this.keptScale)
            .orient("bottom")
            .ticks(10);

        // Make the shown time draggable and resizable
        this.interactable = interact(this.view.timeShown);
        this.interactable.draggable({
            restrict: {
                restriction: this.view.svg
            }
        });
        this.interactable.resizable({
            edges: { bottom: false, left: true, right: true, top: false },
            margin: 5,
            restrictEdges: {
                outer: this.view.svg
            },
            restrictSize: {
                min: {
                    height: 0,
                    width: TimeSlider.minPixelWidth
                }
            }
        });
        this.interactable.on("dragmove", event => {
            const pixel = this.view.shownOffset + this.view.shownWidth;
            this.moveShown(this.toTime(pixel + event.dx));
        });
        this.interactable.on("resizemove", event => {
            const rect = event.deltaRect;
            let offset = this.view.shownOffset;

            if (rect.left !== 0) {
                // If moving left edge, offset changes
                offset += rect.left;
                this.view.shownOffset = offset;
                this.timeShown = this.toTime(offset);
            }

            // Width always changes
            const width = this.view.shownWidth + rect.width;
            this.view.shownWidth = width;
            this.shownWidth = this.toTime(width + offset) - this.toTime(offset);
            this.dispatchShown();
        });

        window.addEventListener("SimControl.reset", event => {
            this.reset();
        });

        window.addEventListener(
            "resize",
            utils.throttle(() => {
                const width = this.view.width;
                this.view.shownWidth = width * this.shownWidth / this.keptWidth;
                this.keptScale.range([0, width]);
                this.view.shownOffset = this.toPixel(
                    this.timeShown - this.shownWidth
                );
                this.sliderAxis(d3.select(this.view.axis));
            }, 66)
        ); // 66 ms throttle = 15 FPS update
    }

    get timeOldest(): number {
        return this.keptScale.domain()[0];
    }

    private dispatchShown() {
        window.dispatchEvent(
            new CustomEvent("TimeSlider.timeShown", {
                detail: {
                    timeShown: this.timeShown,
                    shownWidth: this.shownWidth
                }
            })
        );
    }

    /**
     * Update the axis given a new time point from the simulator.
     *
     * @param {number} time - The new time point
     */
    addTime = utils.throttle(time => {
        const delta = time - this.timeCurrent; // Time since last addTime()
        if (delta < 0) {
            window.dispatchEvent(new Event("SimControl.reset"));
            return;
        }
        this.timeShown = this.timeShown + delta;
        this.timeCurrent = time;

        // Update the limits on the time axis
        this.keptScale.domain([time - this.keptWidth, time]);

        // Update the time axis display
        this.sliderAxis(d3.select(this.view.axis));

        // Fire events so datastores and components can update
        this.dispatchShown();
        window.dispatchEvent(
            new CustomEvent("TimeSlider.addTime", {
                detail: {
                    timeCurrent: this.timeCurrent,
                    keptWidth: this.keptWidth
                }
            })
        );
    }, 10);

    moveShown(time: number) {
        time = utils.clip(
            time,
            this.timeOldest + this.shownWidth,
            this.timeCurrent
        );
        const diff = time - this.timeShown;
        if (diff === 0) {
            return;
        }

        this.timeShown = time;
        this.view.shownOffset = this.toPixel(time - this.shownWidth);
        this.dispatchShown();
    }

    reset() {
        this.timeCurrent = 0.0;
        this.moveShown(this.timeCurrent);
        // Update the limits on the time axis
        this.keptScale.domain([
            this.timeCurrent - this.keptWidth,
            this.timeCurrent
        ]);
        this.sliderAxis(d3.select(this.view.axis));
    }

    resizeShown(startTime: number, endTime: number) {
        // Note: not used in resize handler but useful
        startTime = utils.clip(
            startTime,
            this.timeOldest,
            this.toTime(this.toPixel(endTime) - TimeSlider.minPixelWidth)
        );
        endTime = utils.clip(
            endTime,
            this.toTime(this.toPixel(startTime) + TimeSlider.minPixelWidth),
            this.timeCurrent
        );

        // Adjust width
        this.shownWidth = endTime - startTime;
        this.view.shownWidth = this.toPixel(this.timeOldest + this.shownWidth);
        // Adjust offset
        this.moveShown(endTime);
    }

    toPixel(time: number): number {
        return this.keptScale(time);
    }

    toTime(pixel: number): number {
        return this.keptScale.invert(pixel);
    }
}

export class TimeSliderView {
    axis: SVGGElement;
    root: HTMLDivElement;
    svg: SVGSVGElement;
    timeShown: SVGGElement;

    constructor() {
        const [width, height] = [200, 57];
        const node = h("div.time-slider", [
            h(
                "svg",
                {
                    preserveAspectRatio: "xMinYMin",
                    viewBox: `0 0 ${width} ${height}`
                },
                [
                    h(
                        "g.shown-time",
                        {
                            transform: "translate(0,0)"
                        },
                        [
                            h("rect", {
                                height: `${height}`,
                                width: `${height}`,
                                x: "0",
                                y: "0"
                            }),
                            h("line.shown-time-border#left", {
                                x1: "0",
                                x2: "0",
                                y1: "0",
                                y2: `${height}`
                            }),
                            h("line.shown-time-border#right", {
                                x1: `${height}`,
                                x2: `${height}`,
                                y1: "0",
                                y2: `${height}`
                            })
                        ]
                    ),
                    h("g.axis", {
                        transform: `translate(0,${height / 2})`
                    })
                ]
            )
        ]);
        this.root = dom.create(node).domNode as HTMLDivElement;
        this.svg = this.root.querySelector("svg") as SVGSVGElement;
        this.timeShown = this.svg.querySelector("g.shown-time") as SVGGElement;
        this.axis = this.svg.querySelector("g.axis") as SVGGElement;
    }

    get height(): number {
        return this.root.clientHeight;
    }

    set height(val: number) {
        this.root.style.height = `${val}`;
    }

    /**
     * Offset of the timeShown rect in pixels.
     */
    get shownOffset(): number {
        const [x, y] = utils.getTranslate(this.timeShown);
        console.assert(y === 0);
        return x;
    }

    set shownOffset(val: number) {
        utils.setTranslate(this.timeShown, val, 0);
    }

    get shownWidth(): number {
        const rect = this.svg.querySelector("rect") as SVGRectElement;
        return Number(rect.getAttribute("width"));
    }

    set shownWidth(val: number) {
        const rect = this.svg.querySelector("rect") as SVGRectElement;
        const right = this.svg.getElementById("right") as SVGLineElement;
        const valString = `${val}`;
        rect.setAttribute("width", valString);
        right.setAttribute("x1", valString);
        right.setAttribute("x2", valString);
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
