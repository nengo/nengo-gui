import * as d3 from "d3";
import * as interact from "interact.js";
import * as $ from "jquery";
import { dom, h } from "maquette";

import { Modal } from "./modal";
import * as utils from "./utils";
import { SimControlView } from "./views/sim_control";

const reset_sim = new Event("reset_sim");
const adjust_time = new Event("adjust_time");

/**
 * Control panel for a simulation.
 */
export class SimControl {
    div: HTMLElement;
    modal;

    /**
     * Do we have an update() call scheduled?
     */
    pending_update: boolean = false;

    /**
     * The most recent rate information from the simulator.
     */
    rate: number = 0.0;
    rate_proportion;
    reset_button;
    simulator_options: string = "";
    speed_throttle: SpeedThrottle;
    ticks_tr;

    /**
     * The most recent time from the simulator.
     */
    time: number = 0.0;

    time_scale;
    time_slider: TimeSlider;
    uid;

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
     * @param {Editor} editor - the Editor instance
     */
    constructor(editor, uid, kept_time, shown_time) {
        this.uid = uid;
        if (uid[0] === "<") {
            console.warn("invalid uid for SimControl: " + uid);
        }

        this.view = new SimControlView("sim-control");
        this.div = this.view.root;
        this.ws = utils.create_websocket(this.uid);
        this.time_slider = new TimeSlider({
            height: this.div.clientHeight - 20,
            kept_time: kept_time,
            shown_time: shown_time,
            width: this.div.clientWidth - 300,
        });
        this.speed_throttle = new SpeedThrottle(this.view);

        this.modal = new Modal($(".modal").first(), editor, this);

        document.body.appendChild(this.div);

        // Add event listeners
        this.div.addEventListener("resize", event => {
            this.on_resize(event);
        });

        window.addEventListener("resize", event => {
            this.on_resize(event);
        });

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
            this.on_message(event);
        };

        this.ws.onclose = event => {
            this.disconnected();
        };

        this.time_slider.div.addEventListener("reset_sim", event => {
            this.reset();
            this.div.dispatchEvent(reset_sim);
        });

        this.update();
    }

    get paused(): boolean {
        return this._status === "paused";
    }

    get status(): string {
        return this._status;
    }

    set status(new_status: string) {
        this._status = new_status.trim();

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
                "sim_control does not understand status '" + this._status + "'"
            );
        }
        this.view.pause_icon = icon;
        this.view.spin_pause = spin;
    }

    /**
     * Event handler for received WebSocket messages.
     *
     * @param {MessageEvent} event - The MessageEvent
     */
    on_message(event) {
        if (typeof event.data === "string") {
            if (event.data.slice(0, 7) === "status:") {
                this.status = event.data.slice(7);
            } else if (event.data.slice(0, 5) === "sims:") {
                this.simulator_options = event.data.slice(5);
            } else if (event.data.slice(0, 6) === "config") {
                eval(event.data.slice(6)); // tslint:disable-line
            } else {
                console.warn(
                    "sim_control does not understand '" + event.data + "'"
                );
            }
        } else {
            const data = new Float32Array(event.data);
            this.time = data[0];
            this.speed_throttle.update({
                rate: data[1],
                proportion: data[2],
            });
            this.time = data[0];
            this.rate = data[1];
            this.rate_proportion = data[2];
            if (!this.speed_throttle_set) {
                this.speed_throttle_handle.style.left =
                    this.time_scale(this.rate_proportion);
            }
            this.schedule_update();
        }

        if (this.speed_throttle_changed) {
            this.speed_throttle_changed = false;
            const pixel_value =
                parseFloat(this.speed_throttle_handle.style.left);
            const value = this.time_scale.invert(pixel_value);
            this.ws.send("target_scale:" + value);
        }
    }

    disconnected() {
        $("#main").css("background-color", "#a94442");
        this.modal.title("Nengo has stopped running");
        this.modal.text_body("To continue working with your model, re-run " +
                             "nengo and click Refresh.", "danger");
        this.modal.footer("refresh");
        this.modal.show();
    }

    set_backend(backend) {
        this.ws.send("backend:" + backend);
    }

    /**
     * Make sure update() will be called in the next 10ms.
     */
    schedule_update() {
        if (this.pending_update === false) {
            this.pending_update = true;
            window.setTimeout(() => {
                this.update();
            }, 10);
        }
    }

    pause() {
        if (!this.paused) {
            this.ws.send("pause");
            // TODO: show cog?
        }
    }

    play() {
        if (this.paused) {
            this.ws.send("continue");
            // TODO: show cog?
        }
    }

    /**
     * Informs the backend simulator of the time being reset.
     */
    reset() {
        this.paused = true;
        this.ws.send("reset");
    }

    on_resize(event) {
        this.time_slider.resize(this.div.clientWidth - 290,
                                this.div.clientHeight - 20);
        utils.set_transform(this.pause_button, this.div.clientWidth - 100, 30);
        utils.set_transform(this.reset_button, 110, 30);
    }

    /**
     * Update the visual display.
     */
    update() {
        this.pending_update = false;

        this.ticks_tr.innerHTML = // tslint:disable-line
            "<th>Time</th><td>" + this.time.toFixed(3) + "</td>";
        this.rate_tr.innerHTML = // tslint:disable-line
            "<th>Speed</th><td>" + this.rate.toFixed(2) + "x</td>";

        this.time_slider.update_times(this.time);
    }
}

class SpeedThrottle {
    changed: boolean = false;
    manual: boolean = false;
    time_scale: d3.scale.Linear<number, number>;
    view: SimControlView;
    x: number;

    constructor(view: SimControlView) {
        this.view = view;
        this.time_scale = d3.scale.linear()
            .clamp(true)
            .domain([0, 1.0])
            .range([0, this.view.throttle.clientWidth]);
        this.view.throttle_handle.style.left = String(this.time_scale(1.0));

        interact(this.view.throttle_handle)
            .draggable({
                onmove: event => {
                    this.changed = true;
                    this.x += event.dx;
                    const pixel_value = this.time_scale(
                        this.time_scale.invert(this.speed_throttle_x));
                    this.view.throttle_handle.style.left = pixel_value;
                },
                onstart: event => {
                    this.x = Number(this.view.throttle_handle.style.left);
                    this.manual = true;
                },
            });

    }

    update({time: time, rate: rate, proportion: proportion}) {

    }


}

class TimeSlider {
    axis;
    axis_g;
    div: HTMLElement;
    first_shown_time: number;

    /**
     * Scale to convert time to x value (in pixels)
     */
    kept_scale: d3.scale.Linear<number, number>;

    /**
     * How much total time to store
     */
    kept_time: number;

    /**
     * Most recent time received from simulation
     */
    last_time: number = 0.0;

    shown_div;

    /**
     * How much time to show in normal graphs
     */
    shown_time: number;
    svg;
    view: SimControlView;

    constructor({
        width: width,
        height: height,
        kept_time: kept_time = 4.0,
        shown_time: shown_time = 0.5,
        view: view,
    }) {
        // Get reference to the overall div
        this.view = view;
        this.div = this.view.time_slider;

        this.shown_time = shown_time;
        this.kept_time = kept_time;
        this.first_shown_time = this.last_time - this.shown_time;

        this.kept_scale = d3.scale.linear()
            .domain([0.0 - this.kept_time, 0.0]);

        this.resize(width, height);

        // Build the axis to display inside the scroll area
        this.svg = d3.select(this.div).append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("style", "pointer-events: none; position: absolute;");
        this.axis = d3.svg.axis()
            .scale(this.kept_scale)
            .orient("bottom")
            .ticks(10);
        this.axis_g = this.svg.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(0," + (height / 2) + ")")
            .call(this.axis);

        // Make the shown time draggable and resizable
        interact(this.shown_div)
            .draggable({
                onmove: event => {
                    // Determine where we have been dragged to in time
                    let x = this.kept_scale(this.first_shown_time) + event.dx;
                    const new_time = utils.clip(
                        this.kept_scale.invert(x),
                        this.last_time - this.kept_time,
                        this.last_time - this.shown_time
                    );

                    this.first_shown_time = new_time;
                    x = this.kept_scale(new_time);
                    utils.set_transform(this.shown_div, x, 0);

                    // Update any components who need to know the time changed
                    this.div.dispatchEvent(adjust_time);
                },
            })
            .resizable({
                edges: {bottom: false, left: true, right: true, top: false},
            })
            .on("resizemove", event => {
                const xmin = this.kept_scale(this.last_time - this.kept_time);
                const xmax = this.kept_scale(this.last_time);
                const xa0 = this.kept_scale(this.first_shown_time);
                const xb0 =
                    this.kept_scale(this.first_shown_time + this.shown_time);
                let xa1 = xa0 + event.deltaRect.left;
                let xb1 = xb0 + event.deltaRect.right;

                const min_width = 45;
                xa1 = utils.clip(xa1, xmin, xb0 - min_width);
                xb1 = utils.clip(xb1, xa0 + min_width, xmax);

                // Set slider width and position
                event.target.style.width = (xb1 - xa1) + "px";
                utils.set_transform(event.target, xa1, 0);

                // Update times
                const ta1 = this.kept_scale.invert(xa1);
                const tb1 = this.kept_scale.invert(xb1);
                this.first_shown_time = ta1;
                this.shown_time = tb1 - ta1;

                // Update any components who need to know the time changed
                this.div.dispatchEvent(adjust_time);
            });
    }

    jump_to_end() {
        this.first_shown_time = this.last_time - this.shown_time;

        const x = this.kept_scale(this.first_shown_time);
        utils.set_transform(this.shown_div, x, 0);

        // Update any components who need to know the time changed
        this.div.dispatchEvent(adjust_time);
    }

    reset() {
        this.last_time = 0.0;
        this.first_shown_time = this.last_time - this.shown_time;

        // Update the limits on the time axis
        this.kept_scale.domain([
            this.last_time - this.kept_time, this.last_time,
        ]);

        // Update the time axis display
        this.axis_g
            .call(this.axis);

        const x = this.kept_scale(this.first_shown_time);
        utils.set_transform(this.shown_div, x, 0);

        // Update any components who need to know the time changed
        this.div.dispatchEvent(adjust_time);
    }

    /**
     * Adjust size and location of parts based on overall size.
     *
     * @param {number} width - Width to resize to.
     * @param {number} height - Height to resize to.
     */
    resize(width, height) {
        this.div.style.width = width;
        this.div.style.height = height;
        this.kept_scale.range([0, width]);
        this.shown_div.style.height = height;
        this.shown_div.style.width = width * this.shown_time / this.kept_time;
        utils.set_transform(this.shown_div,
                            this.kept_scale(this.first_shown_time), 0);

        if (this.axis_g !== undefined) {
            this.axis_g.call(this.axis);
        }
    }

    /**
     * Update the axis given a new time point from the simulator.
     *
     * @param {number} time - The new time point
     */
    update_times(time) {
        const delta = time - this.last_time; // Time since last update_time()

        if (delta < 0) {
            this.div.dispatchEvent(reset_sim);
            return;
        }
        this.last_time = time;
        this.first_shown_time = this.first_shown_time + delta;

        // Update the limits on the time axis
        this.kept_scale.domain([time - this.kept_time, time]);

        // Update the time axis display
        this.axis_g.call(this.axis);
    }
}
