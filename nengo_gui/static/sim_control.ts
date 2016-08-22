/**
 * Control panel for a simulation
 *
 * SimControl constructor is inserted into HTML file from python and
 * is called when the page is first loaded
 *
 * @constructor
 * @param {DOMElement} div - the element for the control
 * @param {dict} args - A set of constructor arguments, including:
 * @param {int} args.id - the id of the server-side SimControl to connect to
 */

import * as d3 from "d3";
import * as interact from "interact.js";
import * as $ from "jquery";

import Modal from "./modal";
import "./sim_control.css";
import * as utils from "./utils";

export default class SimControl {
    div;
    listeners;
    modal;
    pause_button;
    pause_button_icon;
    paused;
    pending_update;
    rate;
    rate_proportion;
    rate_tr;
    reset_button;
    rotation;
    rotation_interval;
    simulator_options;
    speed_throttle;
    speed_throttle_changed;
    speed_throttle_guideline;
    speed_throttle_handle;
    speed_throttle_set;
    speed_throttle_x;
    ticks_tr;
    time;
    time_scale;
    time_slider;
    ws;

    constructor(div, args, editor) {
        if (args.uid[0] === "<") {
            console.warn("invalid uid for SimControl: " + args.uid);
        }
        const self = this;
        this.modal = new Modal($(".modal").first(), editor, this);

        div.classList.add("sim_control");
        this.div = div;

        // Respond to resize events
        this.div.addEventListener("resize", function() {
            self.on_resize(null);
        });
        window.addEventListener("resize", function() {
            self.on_resize(null);
        });

        // The most recent time from the simulator
        this.time = 0.0;
        // The most recent rate information from the simulator
        this.rate = 0.0;
        // Whether the simulation is paused
        this.paused = true;
        // Do we have an update() call scheduled?
        this.pending_update = false;

        // Create the WebSocket to communicate with the server
        this.ws = utils.create_websocket(args.uid);

        this.ws.onmessage = function(event) {
            self.on_message(event);
        };
        this.ws.onclose = function(event) {
            self.disconnected();
        };

        // Create the TimeSlider
        this.time_slider = new TimeSlider({
            height: this.div.clientHeight - 20,
            kept_time: args.kept_time,
            shown_time: args.shown_time,
            sim: this,
            width: this.div.clientWidth - 300,
            x: 200,
            y: 10,
        });

        // Get reference to the pause button
        this.pause_button = $("#pause_button")[0];
        this.pause_button.onclick = function(event) {
            self.on_pause_click(null);
        };
        this.pause_button.onkeydown = function(event) {
            const key = event.key || String.fromCharCode(event.keyCode);
            if (key === " ") {
                event.stopPropagation();
            }
        };
        utils.set_transform(this.pause_button, this.div.clientWidth - 100, 30);

        this.pause_button_icon = $("#pause_button_icon")[0];

        // Get reference to the reset button
        this.reset_button = $("#reset_button")[0];
        this.reset_button.onclick = function(event) {
            self.reset();
        };
        utils.set_transform(this.reset_button, 110, 30);

        // Create the speed and rate update sliders
        this.rate_tr = $("#rate_tr")[0];
        this.ticks_tr = $("#ticks_tr")[0];

        this.speed_throttle_set = false;
        this.speed_throttle_changed = false;
        this.speed_throttle = $("#speed_throttle")[0];

        this.speed_throttle_guideline = document.createElement("div");
        this.speed_throttle_guideline.classList.add("guideline");
        this.speed_throttle.appendChild(this.speed_throttle_guideline);

        this.speed_throttle_handle = document.createElement("div");
        this.speed_throttle_handle.classList.add("btn");
        this.speed_throttle_handle.classList.add("btn-default");
        this.speed_throttle_handle.innerHTML = "";
        this.speed_throttle.appendChild(this.speed_throttle_handle);

        this.time_scale = d3.scale.linear();
        this.time_scale.clamp(true);
        this.time_scale.domain([0, 1.0]);
        this.time_scale.range([0, 110.0]); // Width in pixels of slider
        this.speed_throttle_handle.style.left = this.time_scale(1.0);

        interact(this.speed_throttle_handle)
            .draggable({
                onmove: function(event) {
                    self.speed_throttle_changed = true;
                    self.speed_throttle_x += event.dx;
                    const pixel_value = self.time_scale(
                        self.time_scale.invert(self.speed_throttle_x));
                    self.speed_throttle_handle.style.left = pixel_value;
                },
                onstart: function(event) {
                    self.speed_throttle_x = parseFloat(
                        self.speed_throttle_handle.style.left);
                    self.speed_throttle_set = true;
                },
            });

        this.simulator_options = "";

        this.update();
    };

    /**
     * Event handler for received WebSocket messages.
     */
    on_message(event) {
        if (typeof event.data === "string") {
            if (event.data.substring(0, 7) === "status:") {
                this.set_status(event.data.substring(7));
            } else if (event.data.substring(0, 6) === "config") {
                eval(event.data.substring(6, event.data.length)); // tslint:disable-line
            } else if (event.data.substring(0, 5) === "sims:") {
                this.simulator_options = event.data.substring(5, event.data.length);
            }
        } else {
            const data = new Float32Array(event.data);
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
            const pixel_value = parseFloat(this.speed_throttle_handle.style.left);
            const value = this.time_scale.invert(pixel_value);
            this.ws.send("target_scale:" + value);
        }
    };

    disconnected() {
        $("#main").css("background-color", "#a94442");
        this.modal.title("Nengo has stopped running");
        this.modal.text_body("To continue working with your model, re-run " +
                             "nengo and click Refresh.", "danger");
        this.modal.footer("refresh");
        this.modal.show();
    };

    set_backend(backend) {
        this.ws.send("backend:" + backend);
    };

    set_status(status) {
        let icon;
        status = status.trim();
        if (status === "building") {
            icon = "glyphicon-cog";
            this.start_rotating_cog();
            this.paused = false;
        } else if (status === "paused") {
            icon = "glyphicon-play";
            this.stop_rotating_cog();
            this.paused = true;
        } else if (status === "running") {
            icon = "glyphicon-pause";
            this.stop_rotating_cog();
            this.paused = false;
        } else if (status === "build_error") {
            icon = "glyphicon-remove";
            this.stop_rotating_cog();
            this.paused = false;
        } else {
            icon = "glyphicon-cog";
            this.stop_rotating_cog();
            console.warn("unknown status: " + status);
            this.paused = false;
        }
        this.pause_button_icon.className = "glyphicon " + icon;
    };

    start_rotating_cog() {
        const self = this;
        this.rotation = 0;
        this.rotation_interval = window.setInterval(function() {
            self.pause_button_icon.style.transform =
                "rotate(" + self.rotation + "deg)";
            self.rotation += 2;
        }, 10);
        this.pause_button.setAttribute("disabled", "true");
        $("#pause_button").addClass("play-pause-button-cog");
    };

    stop_rotating_cog() {
        this.pause_button.removeAttribute("disabled");
        $("#pause_button").removeClass("play-pause-button-cog");
        window.clearInterval(this.rotation_interval);
        this.pause_button_icon.style.transform = "";
    };

    /**
     * Make sure update() will be called in the next 10ms.
     */
    schedule_update() {
        if (this.pending_update === false) {
            this.pending_update = true;
            const self = this;
            window.setTimeout(function() {
                self.update();
            }, 10);
        }
    };

    /**
     * Add to list of functions to be called when SimControl options change.
     */
    register_listener(func) {
        this.listeners.push(func);
    };

    /**
     * Update the visual display.
     */
    update() {
        this.pending_update = false;

        this.ticks_tr.innerHTML =
            "<th>Time</th><td>" + this.time.toFixed(3) + "</td>";
        this.rate_tr.innerHTML =
            "<th>Speed</th><td>" + this.rate.toFixed(2) + "x</td>";

        this.time_slider.update_times(this.time);
    };

    pause() {
        if (!this.paused) {
            this.ws.send("pause");
        }
        this.paused = true;
    };

    play() {
        if (this.paused) {
            this.ws.send("continue");
            this.paused = false;
        }
    };

    on_pause_click(event) {
        if (this.paused) {
            this.play();
        } else {
            this.pause();
        }
    };

    /**
     * Informs the backend simulator of the time being reset.
     */
    reset() {
        this.paused = true;
        this.ws.send("reset");
    };

    on_resize(event) {
        this.time_slider.resize(this.div.clientWidth - 290,
                                this.div.clientHeight - 20);
        utils.set_transform(this.pause_button, this.div.clientWidth - 100, 30);
        utils.set_transform(this.reset_button, 110, 30);
    };

}

class TimeSlider {
    axis;
    axis_g;
    div;
    first_shown_time;
    kept_scale;
    kept_time;
    last_time;
    shown_div;
    shown_time;
    sim;
    svg;

    constructor(args) {
        const self = this;

        // The SimControl object
        this.sim = args.sim;

        // Get reference to the overall div
        this.div = $(".time_slider")[0];
        utils.set_transform(this.div, args.x, args.y);

        // Create reference to the div indicating currently shown time
        this.shown_div = $(".shown_time")[0];

        // How much time to show in normal graphs
        this.shown_time = args.shown_time || 0.5;
        // How much total time to store
        this.kept_time = args.kept_time || 4.0;
        // Most recent time received from simulation
        this.last_time = 0.0;
        // First time shown on graphs
        this.first_shown_time = this.last_time - this.shown_time;

        // Call reset whenever the simulation is reset
        this.sim.div.addEventListener("sim_reset", function(e) {
            self.reset();
        }, false);

        // Scale to convert time to x value (in pixels)
        this.kept_scale = d3.scale.linear();

        this.kept_scale.domain([0.0 - this.kept_time, 0.0]);

        this.resize(args.width, args.height);

        // Make the shown time draggable and resizable
        interact(this.shown_div)
            .draggable({
                onmove: function(event) {
                    // Determine where we have been dragged to in time
                    let x = self.kept_scale(self.first_shown_time) + event.dx;
                    const new_time = utils.clip(
                        self.kept_scale.invert(x),
                        self.last_time - self.kept_time,
                        self.last_time - self.shown_time);

                    self.first_shown_time = new_time;
                    x = self.kept_scale(new_time);
                    utils.set_transform(event.target, x, 0);

                    // Update any components who need to know the time changed
                    self.sim.div.dispatchEvent(new Event("adjust_time"));
                },
            })
            .resizable({
                edges: {bottom: false, left: true, right: true, top: false},
            })
            .on("resizemove", function(event) {
                const xmin = self.kept_scale(self.last_time - self.kept_time);
                const xmax = self.kept_scale(self.last_time);
                const xa0 = self.kept_scale(self.first_shown_time);
                const xb0 = self.kept_scale(self.first_shown_time + self.shown_time);
                let xa1 = xa0 + event.deltaRect.left;
                let xb1 = xb0 + event.deltaRect.right;

                const min_width = 45;
                xa1 = utils.clip(xa1, xmin, xb0 - min_width);
                xb1 = utils.clip(xb1, xa0 + min_width, xmax);

                // Set slider width and position
                event.target.style.width = (xb1 - xa1) + "px";
                utils.set_transform(event.target, xa1, 0);

                // Update times
                const ta1 = self.kept_scale.invert(xa1);
                const tb1 = self.kept_scale.invert(xb1);
                self.first_shown_time = ta1;
                self.shown_time = tb1 - ta1;

                // Update any components who need to know the time changed
                self.sim.div.dispatchEvent(new Event("adjust_time"));
            });

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
            .attr("transform", "translate(0," + (args.height / 2) + ")")
            .call(this.axis);
    };

    jump_to_end() {
        this.first_shown_time = this.last_time - this.shown_time;

        const x = this.kept_scale(this.first_shown_time);
        utils.set_transform(this.shown_div, x, 0);

        // Update any components who need to know the time changed
        this.sim.div.dispatchEvent(new Event("adjust_time"));
    };

    reset() {
        this.last_time = 0.0;
        this.first_shown_time = this.last_time - this.shown_time;

        // Update the limits on the time axis
        this.kept_scale.domain([this.last_time - this.kept_time, this.last_time]);

        // Update the time axis display
        this.axis_g
            .call(this.axis);

        const x = this.kept_scale(this.first_shown_time);
        utils.set_transform(this.shown_div, x, 0);

        // Update any components who need to know the time changed
        this.sim.div.dispatchEvent(new Event("adjust_time"));
    };

    /**
     * Adjust size and location of parts based on overall size.
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
    };

    /**
     * Update the axis given a new time point from the simulator.
     */
    update_times(time) {
        const delta = time - this.last_time; // Time since last update_time()

        if (delta < 0) {
            this.sim.div.dispatchEvent(new Event("sim_reset"));
            return;
        }
        this.last_time = time;
        this.first_shown_time = this.first_shown_time + delta;

        // Update the limits on the time axis
        this.kept_scale.domain([time - this.kept_time, time]);

        // Update the time axis display
        this.axis_g.call(this.axis);
    };

}
