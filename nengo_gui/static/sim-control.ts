import * as d3 from "d3";
import * as interact from "interact.js";
import * as $ from "jquery";
import { dom, h } from "maquette";

import { Modal } from "./modal";
import * as utils from "./utils";
import {
    SimControlView, SpeedThrottleView, TimeSliderView,
} from "./views/sim_control";

const resetSim = new Event("resetSim");
const adjustTime = new Event("adjustTime");

/**
 * Control panel for a simulation.
 */
export class SimControl {
    /**
     * Do we have an update() call scheduled?
     */
    pendingUpdate: boolean = false;

    simulatorOptions: string = "";
    speedThrottle: SpeedThrottle;

    /**
     * The most recent time from the simulator.
     */
    time: number = 0.0;
    timeSlider: TimeSlider;
    uid: string;

    view: SimControlView;

    /**
     * WebSocket to communicate with the server.
     */
    ws: WebSocket;
    private _status: string = "paused";

    /**
     * SimControl constructor is inserted into HTML file from python and
     * is called when the page is first loaded
     *
     * @constructor
     * @param {HTMLElement} div - the element for the control
     * @param {dict} args - A set of constructor arguments, including:
     * @param {int} args.id - the id of the server-side SimControl to connect to
     */
    constructor(uid, keptTime, shownTime) {
        this.uid = uid;
        if (uid[0] === "<") {
            console.warn("invalid uid for SimControl: " + uid);
        }

        this.view = new SimControlView("sim-control-" + this.uid);
        document.body.appendChild(this.view.root);
        this.ws = utils.createWebsocket(this.uid);

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
            this.reset();
        };

        this.ws.onmessage = event => {
            this.onmessage(event);
        };

        this.ws.onclose = event => {
            this.disconnected();
        };
        this.update();
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
                "simControl does not understand status '" + this._status + "'"
            );
        }
        this.view.pauseIcon = icon;
        this.view.spinPause = spin;
    }

    /**
     * Event handler for received WebSocket messages.
     *
     * @param {MessageEvent} event - The MessageEvent
     */
    onmessage(event) {
        if (typeof event.data === "string") {
            if (event.data.slice(0, 7) === "status:") {
                this.status = event.data.slice(7);
            } else if (event.data.slice(0, 5) === "sims:") {
                this.simulatorOptions = event.data.slice(5);
            } else if (event.data.slice(0, 6) === "config") {
                // TODO: no, bad
                eval(event.data.slice(6)); // tslint:disable-line
            } else {
                console.warn(
                    "simControl does not understand '" + event.data + "'"
                );
            }
        } else {
            const data = new Float32Array(event.data);
            this.speedThrottle.time = data[0];
            this.speedThrottle.speed = data[1];
            this.speedThrottle.proportion = data[2];
            this.scheduleUpdate();
        }
    }

    disconnected() {
        $("#main").css("background-color", "#a94442");
        // this.modal.title("Nengo has stopped running");
        // this.modal.text_body("To continue working with your model, re-run " +
        //                      "nengo and click Refresh.", "danger");
        // this.modal.footer("refresh");
        // this.modal.show();
    }

    setBackend(backend) {
        this.ws.send("backend:" + backend);
    }

    /**
     * Make sure update() will be called in the next 10ms.
     */
    scheduleUpdate() {
        if (this.pendingUpdate === false) {
            this.pendingUpdate = true;
            window.setTimeout(() => {
                this.update();
            }, 10);
        }
    }

    pause() {
        if (!this.paused) {
            this.ws.send("pause");
            // this.status = "paused";
        }
    }

    play() {
        if (this.paused) {
            this.ws.send("continue");
            // this.status = "running";
        }
    }

    /**
     * Informs the backend simulator of the time being reset.
     */
    reset() {
        this.status = "paused";
        this.ws.send("reset");
    }

    /**
     * Update the visual display.
     */
    update() {
        this.pendingUpdate = false;
        this.ws.send("target_scale:" + this.speedThrottle.x);
        this.timeSlider.updateTimes(this.time);
    }
}

class SpeedThrottle {
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

    redraw() {
        this.view.sliderPosition = this.timeScale(this.proportion);
    }
}

class TimeSlider {
    firstShownTime: number;

    /**
     * Scale to convert time to x value (in pixels).
     */
    keptScale: d3.scale.Linear<number, number>;

    /**
     * How much total time to store.
     */
    keptTime: number;

    /**
     * Most recent time received from simulation.
     */
    lastTime: number = 0.0;

    /**
     * How much time to show in normal graphs.
     */
    shownTime: number;

    sliderAxis: d3.svg.Axis;

    svg;

    view: TimeSliderView;

    /**
     * Minimum width of the shownTime box, in pixels.
     */
    static minWidth: number = 45;

    constructor({
        keptTime: keptTime = 4.0,
        shownTime: shownTime = 0.5,
        view: view,
    }) {
        this.view = view;
        this.shownTime = shownTime;
        this.keptTime = keptTime;
        this.firstShownTime = this.lastTime - this.shownTime;

        this.keptScale = d3.scale.linear()
            .domain([0.0 - this.keptTime, 0.0]);

        // Build the axis to display inside the scroll area
        this.sliderAxis = d3.svg.axis()
            .scale(this.keptScale)
            .orient("bottom")
            .ticks(10);

        this.view.callAxis(this.sliderAxis);

        // Make the shown time draggable and resizable
        interact(this.view.shownTime)
            .draggable({
                onmove: event => {
                    // Determine where we have been dragged to in time
                    let x = this.keptScale(this.firstShownTime) + event.dx;
                    this.firstShownTime = utils.clip(
                        this.keptScale.invert(x),
                        this.lastTime - this.keptTime,
                        this.lastTime - this.shownTime
                    );
                    x = this.keptScale(this.firstShownTime);
                    this.view.shownOffset = x;
                    // Update any components who need to know the time changed
                    this.view.root.dispatchEvent(adjustTime);
                },
            })
            .resizable({
                edges: {bottom: false, left: true, right: true, top: false},
            })
            .on("resizemove", event => {
                const xmin = this.keptScale(this.lastTime - this.keptTime);
                const xmax = this.keptScale(this.lastTime);
                const xa0 = this.keptScale(this.firstShownTime);
                const xb0 =
                    this.keptScale(this.firstShownTime + this.shownTime);
                let xa1 = xa0 + event.deltaRect.left;
                let xb1 = xb0 + event.deltaRect.right;

                xa1 = utils.clip(xa1, xmin, xb0 - TimeSlider.minWidth);
                xb1 = utils.clip(xb1, xa0 + TimeSlider.minWidth, xmax);

                // Set slider width and position
                this.view.shownOffset = xa1;
                this.view.shownWidth = xb1 - xa1;

                // Update times
                const ta1 = this.keptScale.invert(xa1);
                const tb1 = this.keptScale.invert(xb1);
                this.firstShownTime = ta1;
                this.shownTime = tb1 - ta1;

                // Update any components who need to know the time changed
                this.view.root.dispatchEvent(adjustTime);
            });

        this.view.root.addEventListener("resetSim", event => {
            this.reset();
            this.view.root.dispatchEvent(resetSim);
        });

        window.onresize = event => {
            this.onresize();
        }
    }

    jumpToEnd() {
        this.firstShownTime = this.lastTime - this.shownTime;
        this.view.shownOffset = this.keptScale(this.firstShownTime);
        // Update any components who need to know the time changed
        this.view.root.dispatchEvent(adjustTime);
    }

    reset() {
        this.lastTime = 0.0;
        this.firstShownTime = this.lastTime - this.shownTime;
        // Update the limits on the time axis
        this.keptScale.domain([
            this.lastTime - this.keptTime, this.lastTime,
        ]);
        this.view.callAxis(this.sliderAxis);
        this.view.shownOffset = this.keptScale(this.firstShownTime);

        // Update any components who need to know the time changed
        this.view.root.dispatchEvent(adjustTime);
    }

    /**
     * Adjust size and location of parts based on overall size.
     *
     * @param {number} width - Width to resize to.
     * @param {number} height - Height to resize to.
     */
    onresize() {


        this.view.shownWidth = width * this.shownTime / this.keptTime;

        this.keptScale.range([0, width]);

        utils.set_transform(this.shown_div,
                            this.keptScale(this.firstShownTime), 0);


        this.view.callAxis(this.sliderAxis);
    }

    /**
     * Update the axis given a new time point from the simulator.
     *
     * @param {number} time - The new time point
     */
    updateTimes(time) {
        const delta = time - this.lastTime; // Time since last update_time()

        if (delta < 0) {
            this.view.root.dispatchEvent(resetSim);
            return;
        }
        this.lastTime = time;
        this.firstShownTime = this.firstShownTime + delta;

        // Update the limits on the time axis
        this.keptScale.domain([time - this.keptTime, time]);

        // Update the time axis display
        this.axis_g.call(this.axis);
    }
}
