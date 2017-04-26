import * as d3 from "d3";
import * as interact from "interact.js";

import { HotkeyManager } from "./hotkeys";
import * as utils from "./utils";
import { AlertDialogView } from "./views/modal";
import {
    SimControlView, SpeedThrottleView, TimeSliderView,
} from "./views/sim-control";
import { Connection, FastWSConnection } from "./websocket";

/**
 * Control panel for a simulation.
 */
export class SimControl {
    simulatorOptions: string = "";
    speedThrottle: SpeedThrottle;
    timeSlider: TimeSlider;
    uid: string;
    view: SimControlView;
    /**
     * WebSocket to communicate with the server.
     */
    ws: FastWSConnection;

    private _status: string = "paused";
    private attached: Connection[] = [];

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
    constructor(uid, keptTime, shownTime: [number, number]) {
        this.uid = uid;
        if (uid[0] === "<") {
            console.warn("invalid uid for SimControl: " + uid);
        }

        this.view = new SimControlView("sim-control-" + this.uid);
        this.timeSlider = new TimeSlider(
            keptTime, shownTime, this.view.timeSlider,
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

        this.ws = new FastWSConnection(
            this.uid,
            (data: ArrayBuffer) => {
                // time, speed, proportion
                return [data[0], data[1], data[2]];
            },
            (time: number, speed: number, proportion: number) => {
                this.timeSlider.addTime(time);
                this.speedThrottle.time = time;
                this.speedThrottle.speed = speed;
                this.speedThrottle.proportion = proportion;
            },
        );
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

    attach(conn: Connection) {
        // conn.bind("open", event => {
        //     this.update();
        // });
        conn.bind("close", event => {
            this.disconnected();
        });
        conn.bind("simcontrol.status", ({status}) => {
            this.status = status;
        });
        conn.bind("simcontrol.simulator", ({simulator}) => {
            this.simulatorOptions = simulator;
        });
        conn.bind("simcontrol.config", ({js}) => {
            // TODO: nooooo
            eval(js);
        });
        this.attached.push(conn);
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
        refresh.addEventListener("click", () => { location.reload(); });
        $(modal.root).on("hidden.bs.modal", () => {
            document.body.removeChild(modal.root);
        });
        document.body.appendChild(modal.root);
        modal.show();
        return modal;
    }

    hotkeys(manager: HotkeyManager) {
        manager.add("Play / pause", " ", (event) => {
            if (!event.repeat) {
                this.togglePlaying();
            }
        });
        manager.add("Play / pause", "enter", {shift: true}, (event) => {
            if (!event.repeat) {
                this.togglePlaying();
            }
        });
    }

    setBackend(backend: string) {
        this.attached.forEach(conn => {
            conn.send("simcontrol.set_backend", {backend: backend});
        });
    }

    pause() {
        if (!this.paused) {
            this.attached.forEach(conn => {
                conn.send("simcontrol.pause");
            });
            // Once paused, simcontrol.status will be set by the server
        } else {
            console.warn("Simulation not running");
        }
    }

    play() {
        if (this.paused) {
            this.attached.forEach(conn => {
                conn.send("simcontrol.play");
            });
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
        this.attached.forEach(conn => {
            conn.send("simcontrol.reset");
        });
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
        this.timeScale = d3.scale.linear()
            .clamp(true)
            .domain([0, 1.0])
            .range([0, this.view.sliderWidth]);
        this.view.sliderPosition = this.timeScale(1.0);

        interact(this.view.handle)
            .draggable({
                onmove: event => {
                    this.x += event.dx;
                },
                onstart: event => {
                    this.x = this.view.sliderPosition;
                    this.manual = true;
                },
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
        this.view.sliderPosition = this.timeScale(
            this.timeScale.invert(val)
        );
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
        view: TimeSliderView,
    ) {
        this.view = view;
        this.keptTime = keptTime;
        this.shownTime = shownTime;

        this.keptScale = d3.scale.linear()
            .domain([0.0 - this.keptTime, 0.0]);
        this.sliderAxis = d3.svg.axis()
            .scale(this.keptScale)
            .orient("bottom")
            .ticks(10);

        // Make the shown time draggable and resizable
        const inBounds = (event) => {
            const relativeX = event.pageX - this.view.svgLeft;
            return relativeX >= 0 && relativeX <= this.view.svgWidth;
        };
        this.interactable = interact(this.view.shownTime);
        this.interactable.draggable(true);
        this.interactable.resizable({
            edges: {bottom: false, left: true, right: true, top: false},
        });
        this.interactable.on("dragmove", event => {
            if (inBounds(event)) {
                this.moveShown(this.toTime(
                    this.toPixel(this.shownTime[0]) + event.dx
                ));
            }
        });
        this.interactable.on("resizemove", event => {
            if (inBounds(event)) {
                const rect = event.deltaRect;
                this.resizeShown(
                    this.toTime(this.toPixel(this.shownTime[0]) + rect.left),
                    this.toTime(this.toPixel(this.shownTime[1]) + rect.right),
                );
            }
        });

        window.addEventListener("SimControl.reset", event => {
            this.reset();
        });

        window.addEventListener("resize", utils.throttle(() => {
            const width = this.view.width;
            this.view.shownWidth = width * this.shownWidth / this.keptTime;
            this.keptScale.range([0, width]);
            this.view.shownOffset = this.toPixel(this.shownTime[0]);
            this.sliderAxis(d3.select(this.view.axis));
        }, 66)); // 66 ms throttle = 15 FPS update
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
        window.dispatchEvent(new CustomEvent("TimeSlider.addTime", {
            detail: {
                currentTime: this.currentTime,
                keptTime: this.keptTime,
            }
        }));
    }

    jumpToEnd() {
        this.moveShown(this.currentTime - this.shownWidth);
    }

    moveShown(time: number) {
        time = utils.clip(
            time, this.firstTime, this.currentTime - this.shownWidth
        );
        this.view.shownOffset = this.toPixel(time);
        const diff = time - this.shownTime[0];
        this.shownTime = [this.shownTime[0] + diff, this.shownTime[1] + diff];

        // Fire an event so datastores and components can update
        window.dispatchEvent(new CustomEvent("TimeSlider.shownTime", {
            detail: {shownTime: this.shownTime}
        }));
    }

    reset() {
        this.currentTime = 0.0;
        this.jumpToEnd();
        // Update the limits on the time axis
        this.keptScale.domain([
            this.currentTime - this.keptTime, this.currentTime,
        ]);
        this.sliderAxis(d3.select(this.view.axis));
    }

    resizeShown(startTime: number, endTime: number) {
        startTime = utils.clip(
            startTime,
            this.firstTime,
            this.toTime(
                this.toPixel(this.shownTime[1]) - TimeSlider.minPixelWidth
            ),
        );
        endTime = utils.clip(
            endTime,
            this.toTime(this.toPixel(startTime) + TimeSlider.minPixelWidth),
            this.currentTime,
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
