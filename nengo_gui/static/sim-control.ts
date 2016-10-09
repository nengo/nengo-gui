import * as d3 from "d3";
import * as interact from "interact.js";
import * as $ from "jquery";
import { dom, h } from "maquette";

import { Modal } from "./modal";
import * as utils from "./utils";
import {
    SimControlView, SpeedThrottleView, TimeSliderView,
} from "./views/sim-control";
import { FastWSConnection, Connection } from "./websocket";

const resetSim = new Event("resetSim");
const adjustTime = new Event("adjustTime");

/**
 * Control panel for a simulation.
 */
export class SimControl {
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
    ws: FastWSConnection;
    private _status: string = "paused";
    private attached: Connection[] = [];

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
        this.ws = new FastWSConnection(this.uid); // TODO: , "simcontrol");

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

        // this.ws.bind

    /**
     * Event handler for received WebSocket messages.
     *
     * @param {MessageEvent} event - The MessageEvent
     */
    // onmessage(event) {
    //     } else {
    //         const data = new Float32Array(event.data);
    //         this.speedThrottle.time = data[0];
    //         this.speedThrottle.speed = data[1];
    //         this.speedThrottle.proportion = data[2];
    //     }
    // }
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

    attach(conn: Connection) {
        conn.bind("open", event => {
            this.update();
        });

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
    update() {
        this.attached.forEach(conn => {
            conn.send("simcontrol.target_scale", {x: this.speedThrottle.x});
        });
        this.timeSlider.addTime(this.time);
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
    /**
     * Minimum width of the shownTime box, in pixels.
     */
    static minWidth: number = 45;

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
        this.sliderAxis = d3.svg.axis()
            .scale(this.keptScale)
            .orient("bottom")
            .ticks(10);
        this.onresize();

        // Make the shown time draggable and resizable
        const inBounds = event => {
            const relativeX = event.pageX - this.view.svgLeft;
            return relativeX >= 0 && relativeX <= this.view.svgWidth;
        };
        interact(this.view.shownTimeHandle)
            .draggable({
                onmove: event => {
                    if (!inBounds(event)) {
                        return;
                    }
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
                if (!inBounds(event)) {
                    return;
                }
                const xmin = this.keptScale(this.lastTime - this.keptTime);
                const xmax = this.keptScale(this.lastTime);
                const xleft = this.keptScale(this.firstShownTime);
                const xright =
                    this.keptScale(this.firstShownTime + this.shownTime);

                const xnewleft = utils.clip(
                    xleft + event.deltaRect.left,
                    xmin,
                    xright - TimeSlider.minWidth
                );
                const xnewright = utils.clip(
                    xright + event.deltaRect.right,
                    xleft + TimeSlider.minWidth,
                    xmax
                );

                // Set slider width and position
                this.view.shownOffset = xnewleft;
                this.view.shownWidth = xnewright - xnewleft;

                // Update times
                const tfirst = this.keptScale.invert(xnewleft);
                const tlast = this.keptScale.invert(xnewright);
                this.firstShownTime = tfirst;
                this.shownTime = tlast - tfirst;

                // Update any components who need to know the time changed
                this.view.root.dispatchEvent(adjustTime);
            });

        this.view.root.addEventListener("resetSim", event => {
            this.reset();
            this.view.root.dispatchEvent(resetSim);
        });

        // 66 ms throttle = 15 FPS update
        window.addEventListener("resize", utils.throttle(() => {
            this.onresize();
        }, 66));
    }

    /**
     * Update the axis given a new time point from the simulator.
     *
     * @param {number} time - The new time point
     */
    addTime(time) {
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
        this.view.callAxis(this.sliderAxis);
    }

    jumpToEnd() {
        this.firstShownTime = this.lastTime - this.shownTime;
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
        const width = this.view.width;
        this.view.shownWidth = width * this.shownTime / this.keptTime;
        this.keptScale.range([0, width]);
        this.view.shownOffset = this.keptScale(this.firstShownTime);
        this.view.callAxis(this.sliderAxis);
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

}
