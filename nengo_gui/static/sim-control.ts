import * as d3 from "d3";
import * as interact from "interact.js";

import { Modal } from "./modal";
import * as utils from "./utils";
import {
    SimControlView, SpeedThrottleView, TimeSliderView,
} from "./views/sim-control";
import { Connection, FastWSConnection } from "./websocket";

const resetSim = new Event("resetSim");
const adjustTime = new Event("adjustTime");

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
    constructor(uid, keptTime, shownTime) {
        this.uid = uid;
        if (uid[0] === "<") {
            console.warn("invalid uid for SimControl: " + uid);
        }

        this.view = new SimControlView("sim-control-" + this.uid);

        this.timeSlider = new TimeSlider({
            keptTime: keptTime,
            shownTime: shownTime,
            view: this.view.timeSlider,
        });
        this.speedThrottle = new SpeedThrottle(this.view.speedThrottle);

        // this.modal = new Modal($(".modal").first(), editor, this);

        this.view.pause.onclick = event => {
            if (this.paused) {
                this.play();
            } else {
                this.pause();
            }
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
        conn.bind("simcontrol.status", ({status: status}) => {
            this.status = status;
        });
        conn.bind("simcontrol.simulator", ({simulator: simulator}) => {
            this.simulatorOptions = simulator;
        });
        conn.bind("simcontrol.config", ({js: js}) => {
            // TODO: nooooo
            eval(js);
        });
        this.attached.push(conn);
    }

    disconnected() {
        // $("#main").css("background-color", "#a94442");
        // this.modal.title("Nengo has stopped running");
        // this.modal.text_body("To continue working with your model, re-run " +
        //                      "nengo and click Refresh.", "danger");
        // this.modal.footer("refresh");
        // this.modal.show();
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
     * Left edge of the shownTime box.
     */
    firstShownTime: number;

    /**
     * How much total time to store.
     *
     * This is also the width of the TimeSlider in seconds.
     */
    keptTime: number;

    /**
     * How much time to show in normal graphs.
     *
     * This is also the width of the shownTime box in seconds.
     */
    shownTime: number;

    /**
     * View associated with this TimeSlider.
     */
    view: TimeSliderView;

    /**
     * Scale to convert time to offset value (in pixels).
     */
    private keptScale: d3.scale.Linear<number, number>;
    private sliderAxis: d3.svg.Axis;

    constructor({
        keptTime: keptTime = 4.0,
        shownTime: shownTime = 0.5,
        view: view,
    }) {
        this.keptTime = keptTime;
        this.view = view;
        this.shownTime = shownTime;

        this.firstShownTime = this.currentTime - this.shownTime;
        this.keptScale = d3.scale.linear()
            .domain([0.0 - this.keptTime, 0.0]);
        this.sliderAxis = d3.svg.axis()
            .scale(this.keptScale)
            .orient("bottom")
            .ticks(10);

        // Make the shown time draggable and resizable
        const inBounds = event => {
            const relativeX = event.pageX - this.view.svgLeft;
            return relativeX >= 0 && relativeX <= this.view.svgWidth;
        };
        interact(this.view.shownTimeHandle)
            .draggable({onmove: event => {
                if (inBounds(event)) {
                    this.moveShown(
                        this.toTime(this.firstShownPixel + event.dx)
                    );
                }
            }})
            .resizable({
                edges: {bottom: false, left: true, right: true, top: false},
            })
            .on("resizemove", event => {
                if (inBounds(event)) {
                    const rect = event.deltaRect;
                    const start = this.toTime(this.firstShownPixel + rect.left);
                    const end = this.toTime(
                        this.firstShownPixel + this.view.shownWidth + rect.right
                    );
                    this.resizeShown(start, end);
                }
            });

        this.view.root.addEventListener("resetSim", event => {
            this.reset();
        });

        // 66 ms throttle = 15 FPS update
        window.addEventListener("resize", utils.throttle(() => {
            const width = this.view.width;
            this.view.shownWidth = width * this.shownTime / this.keptTime;
            this.keptScale.range([0, width]);
            this.view.shownOffset = this.firstShownPixel;
            this.view.callAxis(this.sliderAxis);
        }, 66));
    }

    get firstShownPixel(): number {
        return this.toPixel(this.firstShownTime);
    }

    get firstTime(): number {
        return this.keptScale.domain()[0];
    }

    /**
     * Update the axis given a new time point from the simulator.
     *
     * @param {number} time - The new time point
     */
    addTime(time) {
        const delta = time - this.currentTime; // Time since last addTime()

        if (delta < 0) {
            this.view.root.dispatchEvent(resetSim);
            return;
        }
        this.currentTime = time;
        this.firstShownTime = this.firstShownTime + delta;

        // Update the limits on the time axis
        this.keptScale.domain([time - this.keptTime, time]);

        // Update the time axis display
        this.view.callAxis(this.sliderAxis);
    }

    jumpToEnd() {
        this.moveShown(this.currentTime - this.shownTime);
    }

    moveShown(time: number) {
        this.firstShownTime = utils.clip(
            time,
            this.firstTime,
            this.currentTime - this.shownTime
        );
        this.view.shownOffset = this.firstShownPixel;
        this.view.root.dispatchEvent(adjustTime);
    }

    resizeShown(startTime: number, endTime: number) {
        startTime = utils.clip(
            startTime,
            this.firstTime,
            this.toTime(
                this.toPixel(this.firstShownTime + this.shownTime)
                    - TimeSlider.minPixelWidth
            ),
        );
        endTime = utils.clip(
            endTime,
            this.toTime(this.toPixel(startTime) + TimeSlider.minPixelWidth),
            this.currentTime,
        );

        // Update times
        this.firstShownTime = startTime;
        this.shownTime = endTime - startTime;

        // Adjust width
        this.view.shownWidth = this.toPixel(endTime) - this.toPixel(startTime);

        // Adjust offset
        this.moveShown(this.firstShownTime);
    }

    reset() {
        this.currentTime = 0.0;
        this.jumpToEnd();
        // Update the limits on the time axis
        this.keptScale.domain([
            this.currentTime - this.keptTime, this.currentTime,
        ]);
        this.view.callAxis(this.sliderAxis);
    }

    toPixel(time: number): number {
        return this.keptScale(time);
    }

    toTime(pixel: number): number {
        return this.keptScale.invert(pixel);
    }
}
