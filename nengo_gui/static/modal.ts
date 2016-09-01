import * as d3 from "d3";
import * as $ from "jquery";

import * as all_components from "./components/all_components";
import Hotkeys from "./hotkeys";
import "./modal.css";
import * as tooltips from "./tooltips";
import * as utils from "./utils";

export default class Modal {
    $body;
    $div;
    $footer;
    $title;
    config;
    editor;
    hotkeys;
    netgraph;
    sim;
    sim_was_running;
    toolbar;

    constructor($div, editor, sim) {
        const self = this;
        this.$div = $div;
        this.$title = this.$div.find(".modal-title").first();
        this.$footer = this.$div.find(".modal-footer").first();
        this.$body = this.$div.find(".modal-body").first();
        this.editor = editor;
        this.sim = sim;
        this.netgraph = this.editor.netgraph;
        this.config = this.netgraph.config;
        this.hotkeys = new Hotkeys(this.editor, this);

        this.sim_was_running = false;

        // This listener is triggered when the modal is closed
        this.$div.on("hidden.bs.modal", function() {
            if (self.sim_was_running) {
                self.sim.play();
            }
            self.hotkeys.set_active(true);
        });
    };

    show() {
        this.hotkeys.set_active(false);
        this.sim_was_running = !this.sim.paused;
        this.$div.modal("show");
        this.sim.pause();
    };

    title(title) {
        this.$title.text(title);
    };

    footer(type, ok_function, cancel_function) {
        const self = this;
        this.$footer.empty();

        if (type === "close") {
            this.$footer.append(
                "<button type='button' class='btn btn-default'" +
                    " data-dismiss='modal'>Close</button>");
        } else if (type === "ok_cancel") {
            const $footerBtn = $("<div class='form-group'/>")
                .appendTo(this.$footer);
            $footerBtn.append("<button id='cancel-button' type='button' " +
                              "class='btn btn-default'>Cancel</button>");
            $footerBtn.append("<button id='OK' type='submit' " +
                              "class='btn btn-primary'>OK</button>");
            $("#OK").on("click", ok_function);
            if (typeof cancel_function !== "undefined") {
                $("#cancel-button").on("click", cancel_function);
            } else {
                $("#cancel-button").on("click", function() {
                    $("#cancel-button").attr("data-dismiss", "modal");
                });
            }
        } else if (type === "confirm_reset") {
            this.$footer.append("<button type='button' " +
                                "id='confirm_reset_button' " +
                                "class='btn btn-primary'>Reset</button>");
            this.$footer.append("<button type='button' " +
                                "class='btn btn-default' " +
                                "data-dismiss='modal'>Close</button>");
            $("#confirm_reset_button").on("click", function() {
                self.toolbar.reset_model_layout();
            });
        } else if (type === "confirm_savepdf") {
            this.$footer.append(
                "<button type='button' " +
                    "id='confirm_savepdf_button' class='btn btn-primary' " +
                    "data-dismiss='modal'>Save</button>");
            this.$footer.append("<button type='button' " +
                                "class='btn btn-default' " +
                                "data-dismiss='modal'>Close</button>");
            $("#confirm_savepdf_button").on("click", function() {
                const svg = $("#main svg")[0];

                // Serialize SVG as XML
                const svg_xml = (new XMLSerializer()).serializeToString(svg);
                let source = "<?xml version='1.0' standalone='no'?>" + svg_xml;
                source = source.replace("&lt;", "<");
                source = source.replace("&gt;", ">");

                const svg_uri = "data:image/svg+xml;base64," + btoa(source);

                // Extract filename from the path
                const path = $("#filename")[0].textContent;
                let filename = path.split("/").pop();
                filename = filename.split(".")[0];

                // Initiate download
                let link = document.createElement("a");
                // Experimental future feature; uncomment when finalized.
                // link.download = filename + ".svg";
                link.href = svg_uri;

                // Adding element to the DOM (needed for Firefox)
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
        } else if (type === "confirm_savecsv") {
            this.$footer.append(
                "<button type='button' " +
                    "id='confirm_savecsv_button' class='btn btn-primary' " +
                    "data-dismiss='modal'>Save</button>");
            this.$footer.append("<button type='button' " +
                                "class='btn btn-default' " +
                                "data-dismiss='modal'>Close</button>");
            $("#confirm_savecsv_button").on("click", function() {

                const csv = all_components.to_csv();
                // Extract filename from the path
                const path = $("#filename")[0].textContent;
                let filename = path.split("/").pop();
                filename = filename.split(".")[0];

                const uri =
                    "data:text/csv;charset=utf-8," + encodeURIComponent(csv);

                let link = document.createElement("a");
                link.href = uri;
                link.style.visibility = "hidden";
                // Experimental future feature; uncomment when finalized.
                // link.download = filename + ".csv";
                // Adding element to the DOM (needed for Firefox)
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });

        } else if (type === "refresh") {
            this.$footer.append("<button type='button' " +
                                "id='refresh_button' " +
                                "class='btn btn-primary'>Refresh</button>");
            $("#refresh_button").on("click", function() {
                location.reload();
            });
        } else {
            console.warn("Modal footer type " + type + " not recognized.");
        }
    };

    clear_body() {
        this.$body.empty();
        this.$div.find(".modal-dialog").removeClass("modal-sm");
        this.$div.off("shown.bs.modal");
    };

    text_body(text, type) {
        if (typeof type === "undefined") { type = "info"; }

        this.clear_body();
        const $alert = $("<div class='alert alert-" + type + "' role='alert'/>")
            .appendTo(this.$body);
        const $p = $("<p/>").appendTo($alert);
        $p.append("<span class='glyphicon glyphicon-exclamation-sign' " +
                  "aria-hidden='true'></span>");
        $p.append(document.createTextNode(text));
    };

    help_body() {
        this.clear_body();

        let ctrl = "Ctrl";
        let shift = "Shift";

        if (navigator.userAgent.toLowerCase().indexOf("mac") > -1) {
            ctrl = "&#8984;";
            shift = "&#8679;";
        }

        this.$div.find(".modal-dialog").addClass("modal-sm");
        const $body = $("<table class='table-striped' width=100%>");
        // TODO: make this fit
        $body.append("<tr><td>Play / pause</td>" +
                     "<td align='right'>Spacebar, " + shift +
                     "-Enter</td></tr>");
        $body.append("<tr><td>Undo</td>" +
                     "<td align='right'>" + ctrl + "-z</td></tr>");
        $body.append("<tr><td>Redo</td>" +
                     "<td align='right'>" + ctrl + "-" + shift +
                     "-z, " + ctrl + "-y</td></tr>");
        $body.append("<tr><td>Save</td>" +
                     "<td align='right'>" + ctrl + "-s</td></tr>");
        $body.append("<tr><td>Toggle minimap</td>" +
                     "<td align='right'>" + ctrl + "-m</td></tr>");
        $body.append("<tr><td>Toggle editor</td>" +
                     "<td align='right'>" + ctrl + "-e</td></tr>");
        // TODO: possibly pick a better shortcut key
        $body.append("<tr><td>Update display</td>" +
                     "<td align='right'>" + ctrl + "-1</td></tr>");
        $body.append("<tr><td>Toggle auto-update</td>" +
                     "<td align='right'>" + ctrl + "-" + shift +
                     "-1</td></tr>");
        $body.append("<tr><td>Show hotkeys</td>" +
                     "<td align='right'>?</td></tr>");
        $body.append("</table>");
        $body.appendTo(this.$body);
    };

    /**
     * Sets up the tabs for Info modals.
     */
    tabbed_body(tabinfo) {
        this.clear_body();
        const tabdivs = {};
        const $tab_ul = $("<ul class='nav nav-tabs'/>").appendTo(this.$body);
        const $content = $("<div class='tab-content'/>").appendTo(this.$body);

        for (let i = 0; i < tabinfo.length; i++) {
            // <li> for the tab label
            const $tab_li = $("<li/>").appendTo($tab_ul);
            $tab_li.append("<a href='#" + tabinfo[i].id +
                           "' data-toggle='tab'>" +
                           tabinfo[i].title + "</a>");

            // <div> for the tab content
            tabdivs[tabinfo[i].id] = $(
                "<div class='tab-pane' id='" + tabinfo[i].id + "'/>")
                .appendTo($content);
            if (i === 0) {
                $tab_li.addClass("active");
                tabdivs[tabinfo[i].id].addClass("active");
            }
        }
        return tabdivs;
    };

    /**
     * Sets up the body for main configuration.
     */
    main_config() {
        const self = this;
        this.clear_body();

        const $form = $("<form class='form-horizontal' id" +
                        "='myModalForm'/>").appendTo(this.$body);
        $("<div class='form-group' id='config-fontsize-group'>" +
          "<label for='config-fontsize' class='control-label'>" +
          "Font size</label>" +
          "<div class='input-group col-xs-2'>" +
          "<input type='number' min='20' max='999' step='1' " +
          "maxlength='3' class='form-control' id='config-fontsize' " +
          "data-error='Twenty to 999 percent of the base size' " +
          "required>" +
          "<span class='input-group-addon'>%</span>" +
          "</div>" +
          "<span class='help-block with-errors'>As a percentage of " +
          "the base size</span>" +
          "</div>" +
          "<div class='form-group'>" +
          "<div class='checkbox'>" +
          "<label for='zoom-fonts' class='control-label'>" +
          "<input type='checkbox' id='zoom-fonts'>" +
          "Scale text when zooming" +
          "</label>" +
          "<div class='help-block with-errors'></div>" +
          "</div>" +
          "</div>" +
          "<div class='form-group'>" +
          "<div class='checkbox'>" +
          "<label for='aspect-resize' class='control-label'>" +
          "<input type='checkbox' id='aspect-resize'>" +
          "Fix aspect ratio of elements on canvas resize" +
          "</label>" +
          "<div class='help-block with-errors'></div>" +
          "</div>" +
          "</div>" +
          "<div class='form-group'>" +
          "<div class='checkbox'>" +
          "<label for='sync-editor' class='control-label'>" +
          "<input type='checkbox' id='sync-editor'>" +
          "Automatically synchronize model with editor" +
          "</label>" +
          "<div class='help-block with-errors'></div>" +
          "</div>" +
          "</div>" +
          "<div class='form-group'>" +
          "<div class='checkbox'>" +
          "<label for='transparent-nets' class='control-label'>" +
          "<input type='checkbox' id='transparent-nets'>" +
          "Expanded networks are transparent" +
          "</label>" +
          "<div class='help-block with-errors'></div>" +
          "</div>" +
          "</div>" +
          "<div class='form-group' id='config-scriptdir-group'>" +
          "<label for='config-scriptdir' class='control-label'>" +
          "Script directory</label>" +
          "<input type='text' id='config-scriptdir' class='form-control' " +
          "placeholder='Current directory'/>" +
          "<span class='help-block with-errors'>Enter a full absolute path " +
          "or leave blank to use the current directory.</span>" +
          "</div>" +
          "<div class='form-group'>" +
          "<label for='config-backend' class='control-label'>" +
          "Select backend" +
          "</label>" +
          "<select class='form-control' id='config-backend'>" +
          this.sim.simulator_options +
          "</select>" +
          "</div>" +
          "</div>").appendTo($form);

        this.$div.on("shown.bs.modal", function() {
            $("#config-fontsize").focus();
        });
        $("#zoom-fonts").prop("checked", this.netgraph.zoom_fonts);
        $("#zoom-fonts").change(function() {
            self.netgraph.zoom_fonts = $("#zoom-fonts").prop("checked");
        });

        $("#aspect-resize").prop("checked", this.netgraph.aspect_resize);
        $("#aspect-resize").change(function() {
            self.netgraph.aspect_resize = $("#aspect-resize").prop("checked");
        });

        $("#transparent-nets").prop("checked", this.netgraph.transparent_nets);
        $("#transparent-nets").change(function() {
            self.netgraph.transparent_nets =
                $("#transparent-nets").prop("checked");
        });

        $("#sync-editor").prop("checked", self.editor.auto_update);
        $("#sync-editor").change(function() {
            self.editor.auto_update = $("#sync-editor").prop("checked");
            self.editor.update_trigger = $("#sync-editor").prop("checked");
        });

        $("#config-fontsize").val(this.netgraph.font_size);
        $("#config-fontsize").bind("keyup input", function() {
            self.netgraph.font_size = parseInt($("#config-fontsize").val(), 10);
        });
        $("#config-fontsize").attr("data-my_validator", "custom");

        let sd = this.config.scriptdir;
        if (sd === ".") {
            sd = "";
        }
        $("#config-scriptdir").val(sd);
        $("#config-scriptdir").bind("keyup input", function() {
            let newsd = $("#config-scriptdir").val();
            if (!newsd) {
                newsd = ".";
            }
            self.config.scriptdir = newsd;
        });

        $("#config-backend").change(function() {
            self.sim.set_backend($("#config-backend").val());
        });

        // Allow the enter key to submit
        const submit = function(event) {
            if (event.which === 13) {
                event.preventDefault();
                $("#OK").click();
            }
        };
        $("#config-fontsize").keypress(submit);
        $("#config-scriptdir").keypress(submit);
    };

    /**
     * Sets up the body for standard input forms.
     */
    single_input_body(start_values, label) {
        this.clear_body();

        const $form = $("<form class='form-horizontal' id ='myModalForm'/>")
            .appendTo(this.$body);
        const $ctrlg = $("<div class='form-group'/>").appendTo($form);
        $ctrlg.append("<label class='control-label' for='singleInput'>" +
                      label + "</label>");
        const $ctrls = $("<div class='controls'/>").appendTo($ctrlg);
        $ctrls.append("<input id='singleInput' type='text' placeholder='" +
                      start_values + "'/>");
        $("<div class='help-block with-errors'/>").appendTo($ctrls);
        this.$div.on("shown.bs.modal", function() {
            $("#singleInput").focus();
        });

        // Add custom validator
        $("#singleInput").attr("data-my_validator", "custom");

        $(".controls").on("keydown", "#singleInput", function(event) {
            // Allow the enter key to submit
            if (event.which === 13) {
                event.preventDefault();
                $("#OK").click();
            }
            // Allow tabs to enter in default values
            if ((event.keyCode || event.which) === 9) {
                const values = $("#singleInput").attr("placeholder").split(",");
                const cur_val = $("#singleInput").val();
                let cur_index = cur_val.split(",").length - 1;
                let pre = " "; // Space and possible comma before value
                let post = ","; // Possible comma after value

                // Only do special things if there are more values to enter
                if (cur_index < values.length) {
                    // Compute the correct current index
                    if (cur_val.length > 0) {
                        if (cur_val.trim().slice(-1) !== ",") {
                            cur_index += 1;
                            pre = ", "; // Need a comma as well between values
                        }
                    } else {
                        pre = ""; // No space for the first value
                    }
                    if (cur_index === values.length - 1) {
                        post = "";
                    }
                    // If the last character is a comma or there are no
                    // characters, fill in the next default value
                    if (cur_val.length === 0 ||
                            cur_val.trim().slice(-1) === ",") {
                        $("#singleInput").val(
                            $("#singleInput").val() + pre +
                                values[cur_index].trim() + post);
                        event.preventDefault();
                    } else {
                        if (cur_index < values.length) {
                            $("#singleInput")
                                .val($("#singleInput").val() + ", ");
                            event.preventDefault();
                        }
                    }
                }
            }
        });
    };

    ensemble_body(uid, params, plots, conninfo) {
        const tabs = this.tabbed_body([
            {id: "params", title: "Parameters"},
            {id: "plots", title: "Plots"},
            {id: "connections", title: "Connections"}]);
        this.render_params(tabs["params"], params, tooltips.Ens); // tslint:disable-line
        this.render_plots(tabs["plots"], plots); // tslint:disable-line
        this.render_connections(tabs["connections"], uid, conninfo); // tslint:disable-line
    };

    node_body(uid, params, plots, conninfo) {
        const tabs: any = this.tabbed_body([
            {id: "params", title: "Parameters"},
            {id: "plots", title: "Plots"},
            {id: "connections", title: "Connections"},
        ]);
        this.render_params(tabs.params, params, tooltips.Node);
        this.render_plots(tabs.plots, plots);
        this.render_connections(tabs.connections, uid, conninfo);
    };

    net_body(uid, stats, conninfo) {
        const tabs: any = this.tabbed_body([
            {id: "stats", title: "Statistics"},
            {id: "connections", title: "Connections"},
        ]);
        this.render_stats(tabs.stats, stats);
        this.render_connections(tabs.connections, uid, conninfo);
    };

    /**
     * Renders information about the parameters of an object.
     */
    render_params($parent, params, strings) {
        const $plist = $("<dl class='dl-horizontal'/>").appendTo($parent);
        for (let i = 0; i < params.length; i++) {
            const $dt = $("<dt/>").appendTo($plist);
            $dt.text(params[i][0]);

            const $dd = $("<dd/>").appendTo($plist);
            $dd.text(params[i][1]);
            tooltips.popover($dt, params[i][0], strings[params[i][0]]);
        }
    };

    /**
     * Renders information about some statistics of an object.
     */
    render_stats($parent, stats) {
        for (let i = 0; i < stats.length; i++) {
            $parent.append("<h3>" + stats[i].title + "</h3>");
            const $stable =
                $("<table class='table table-condensed table-hover'/>")
                .appendTo($parent);

            for (let j = 0; j < stats[i].stats.length; j++) {
                const $tr = $("<tr/>").appendTo($stable);
                const $desc = $("<td class='col-md-8'/>").appendTo($tr);
                $desc.text(stats[i].stats[j][0]);
                const $val = $("<td class='col-md-4'/>").appendTo($tr);
                $val.text(stats[i].stats[j][1]);
            }
        }
    };

    /**
     * Renders information about plots related to an object.
     */
    render_plots($parent, plots) {
        // This indicates an error (usually no sim running)
        if (typeof plots === "string") {
            const $err = $("<div class='alert alert-danger' role='alert'/>")
                .appendTo($parent);
            $err.append("<span class='glyphicon glyphicon-exclamation-sign' " +
                        "aria-hidden='true'></span>");
            $err.append("<span class='sr-only'>Error:</span>");
            $err.append(document.createTextNode(plots));
        } else {
            for (let i = 0; i < plots.length; i++) {
                this.render_plot($parent, plots[i]);
            }
        }
    };

    /**
     * Renders information about a single plot.
     */
    render_plot($parent, plotinfo) {
        $parent.append("<h4>" + plotinfo.title + "</h4>");

        if (plotinfo.warnings.length > 0) {
            const $warn = $("<div class='alert alert-warning' role='alert'/>")
                .appendTo($parent);

            for (let i = 0; i < plotinfo.warnings.length; i++) {
                const $p = $("<p/>").appendTo($warn);
                $p.append("<span class='glyphicon glyphicon" +
                          "-exclamation-sign' aria-hidden='true'></span>");
                $p.append("<span class='sr-only'>Warning:</span>");
                $p.append(document.createTextNode(plotinfo.warnings[i]));
            }
        }

        if (plotinfo.plot === "multiline") {
            this.multiline_plot(
                $parent.get(0),
                plotinfo.x,
                plotinfo.y,
                plotinfo.x_label,
                plotinfo.y_label);
        } else if (plotinfo.plot !== "none") {
            console.warn("Plot type " + plotinfo.plot +
                         " not understood, or not implemented yet.");
        }
    };

    /**
     * Static multiline plot with shared x-axis
     *
     * @param {string} selector - Where the svg will be added
     * @param {float[]} x - The shared x-axis
     * @param {float[][]} ys - The y data for each line
     */
    multiline_plot(selector, x, ys: number[][], x_label, y_label) {

        const margin = {bottom: 50, left: 75, right: 0, top: 10};
        const w = 500 - margin.left - margin.right;
        const h = 220 - margin.bottom - margin.top;
        const graph_w = w + margin.left + margin.right;
        const graph_h = h + margin.bottom + margin.top;
        const text_offset = 15;

        const scale_x = d3.scale.linear()
            .domain([x[0], x[x.length - 1]])
            .range([margin.left, w - margin.right]);
        const scale_y = d3.scale.linear()
            .domain([d3.min(ys, function(y) {
                return d3.min(y);
            }) - 0.01, d3.max(ys, function(y) {
                return d3.max(y);
            }) + 0.01])
            .range([h + margin.top, margin.top]);

        // Add an SVG element with the desired dimensions and margin.
        const svg = d3.select(selector).append("svg");
        const graph = svg.attr("width", graph_w).attr("height", graph_h);

        // Create the axes
        const xAxis = d3.svg.axis()
            .scale(scale_x)
            .orient("bottom")
            .ticks(9);
        graph.append("g")
            .attr("class", "axis axis_x unselectable")
            .attr("transform", "translate(0," + (h + margin.top) + ")")
            .call(xAxis);

        const yAxisLeft = d3.svg.axis()
            .scale(scale_y)
            .ticks(5)
            .orient("left");
        graph.append("g")
            .attr("class", "axis axis_y unselectable")
            .attr("transform", "translate(" + margin.left + ",0)")
            .call(yAxisLeft);

        // Label the axes
        if (x_label !== "") {
            svg.append("text")
                .attr("class", "x label")
                .attr("text-anchor", "middle")
                .attr("x", graph_w / 2)
                .attr("y", text_offset + graph_h - margin.bottom / 2)
                .text(x_label);
        }

        if (y_label !== "") {
            svg.append("text")
                .attr("class", "y label")
                .attr("text-anchor", "middle")
                .attr("x", -graph_h / 2)
                .attr("y", -text_offset + margin.left / 2)
                .attr("dy", ".75em")
                .attr("transform", "rotate(-90)")
                .text(y_label);
        }

        // Add the lines
        const colors = utils.make_colors(ys.length);

        const line = d3.svg.line<number>()
            .x(function(d, i) {
                return scale_x(x[i]);
            }).y(function(d) {
                return scale_y(d);
            });

        graph.append("g")
            .selectAll("path")
            .data(ys)
            .enter()
            .append("path")
            .attr("d", line)
            .attr("class", "line")
            .style("stroke", function(d, i) {
                return colors[i];
            });
    };

    /**
     * Renders information about connections related to an object.
     */
    render_connections($parent, uid, conninfo) {
        const ngi = this.netgraph.svg_objects[uid];
        const conn_in_objs = ngi.conn_in;
        if (conn_in_objs.length > 0) {
            $parent.append("<h3>Incoming Connections</h3>");

            const $conn_in_table =
                $("<table class='table table-condensed'><tr>" +
                  "<th class='conn-objs'>Object</th>" +
                  "<th class='conn-funcs'>Function</th>" +
                  "<th class='conn-fan'>Fan In</th></tr>")
                .appendTo($parent);
            tooltips.popover($conn_in_table.find(".conn-objs").first(),
                             "'Pre' object",
                             "This object plays the role of 'Pre' in the " +
                             "connection to this object.",
                             "top");
            tooltips.popover($conn_in_table.find(".conn-funcs").first(),
                             "Connection function",
                             "The function being computed across this " +
                             "connection (in vector space).",
                             "top");
            tooltips.popover($conn_in_table.find(".conn-fan").first(),
                             "Neuron fan-in",
                             "The number of incoming neural connections. " +
                             "In biological terms, this is the maximum number" +
                             " of " +
                             "synapses in the dendritic tree of a single " +
                             "neuron in this object, resulting from this " +
                             "connection. The total number of synapses would " +
                             "be the sum of the non-zero numbers in this " +
                             "column.",
                             "top");

            this.make_connections_table_row(
                $conn_in_table, conninfo, conn_in_objs,
                function(conn_obj) {
                    return conn_obj.pre;
                }, function(conn_obj) {
                    return conn_obj.pres;
                });
        }

        const conn_out_objs = ngi.conn_out;
        if (conn_out_objs.length > 0) {
            if (conn_in_objs.length > 0) {
                $parent.append("<hr/>");
            }
            $parent.append("<h3>Outgoing Connections</h3>");

            const $conn_out_table =
                $("<table class='table table-condensed'><tr>" +
                  "<th class='conn-objs'>Object</th>" +
                  "<th class='conn-funcs'>Function</th>" +
                  "<th class='conn-fan'>Fan Out</th></tr>")
                .appendTo($parent);

            tooltips.popover($conn_out_table.find(".conn-objs").first(),
                             "'Post' object",
                             "This object plays the role of 'Post' in the " +
                             "connection from this object.",
                             "top");
            tooltips.popover($conn_out_table.find(".conn-funcs").first(),
                             "Connection function",
                             "The function being computed across this " +
                             "connection (in vector space).",
                             "top");
            tooltips.popover($conn_out_table.find(".conn-fan").first(),
                             "Neuron fan-out",
                             "The number of outgoing neural connections. " +
                             "In biological terms, this is the maximum number" +
                             " of " +
                             "synapses from axon terminals of a single " +
                             "neuron in this object, resulting from this " +
                             "connection. The total number of synapses would " +
                             "be the sum of the non-zero numbers in this " +
                             "column.",
                             "top");

            this.make_connections_table_row(
                $conn_out_table, conninfo, conn_out_objs,
                function(conn_obj) {
                    return conn_obj.post;
                },
                function(conn_obj) {
                    return conn_obj.posts;
                });
        }

        if (conn_in_objs.length === 0 && conn_out_objs.length === 0) {
            const $warn = $("<div class='alert alert-warning' role='alert'/>")
                .appendTo($parent);
            const $p = $("<p/>").appendTo($warn);
            $p.append("<span class='glyphicon glyphicon-exclamation-sign' " +
                      "aria-hidden='true'></span>");
            $p.append("<span class='sr-only'>Warning:</span>");
            if (ngi.type === "net" && ngi.expanded) {
                $p.append(document.createTextNode(
                    "Network is expanded. Please see individual objects " +
                        "for connection info."));
            } else {
                $p.append(document.createTextNode(
                    "No connections to or from this object."));
            }
        }
    };

    /**
     * Generates one row in the connections table in the connections tab.
     */
    make_connections_table_row(
        $table, conninfo, conn_objs, get_conn_other, get_conn_conn_uid_list) {
        for (let i = 0; i < conn_objs.length; i++) {
            // Get a handle to the object that we're connected to
            const conn_other = get_conn_other(conn_objs[i]);

            // Make a row in the table
            const $tr = $("<tr/>").appendTo($table);

            // Make the objects column
            const $objs_td = $("<td>" + String(conn_other.label.innerHTML) +
                             "</td>").appendTo($tr);
            this.make_conn_path_dropdown_list(
                $objs_td,
                conn_other.uid,
                conninfo.obj_type[String(conn_objs[i].uid)],
                get_conn_conn_uid_list(conn_objs[i]));

            // Make the functions column
            const $func_td = $("<td/>").appendTo($tr);
            $func_td.text(conninfo.func[String(conn_objs[i].uid)]);

            // Make the fan data column
            const $fan_td = $("<td>" +
                            conninfo.fan[String(conn_objs[i].uid)] + "</td>")
                .appendTo($tr);
            if (conninfo.obj_type[String(conn_objs[i].uid)] === "passthrough") {
                tooltips.tooltip($fan_td, tooltips.Conn.fan_passthrough);
            }
        }
    };

    /**
     * Generates the connection path dropdown list for the connections tab.
     */
    make_conn_path_dropdown_list(
        $container, others_uid, obj_type, conn_uid_list) {
        if (conn_uid_list.length > 1) {
            // Add expand control and the tooltip to the <dd> object
            const $lg_header =
                $("<a data-toggle='collapse' href='#pathlist" +
                  String(conn_uid_list[0]).replace(/[\.\[\]]/g, "_") +
                  "' aria-expanded='false'/>").appendTo($container);

            // Make the "expand down" tooltip
            tooltips.tooltip($lg_header, tooltips.Conn.expand, "right");

            // Make a list-group for the drop down items
            const $path_list = $("<ul class='list-group'>")
                .appendTo($("<div class='collapse' id='pathlist" +
                            String(conn_uid_list[0]).replace(/[\.\[\]]/g, "_") +
                            "'/>")
                          .appendTo($container));

            // Add the root "Model" item to the drop down list
            $path_list.append(
                "<li class='list-group-item shaded'>" +
                    "<span class='glyphicon glyphicon-home'/>Model</a>");

            // Populate the list-group
            let shaded_option = "shaded";
            let endpoint_icon = "glyphicon glyphicon-triangle-right";
            let path_item: string;
            for (let p = conn_uid_list.length - 1; p >= 0; p--) {
                if (conn_uid_list[p] in this.netgraph.svg_objects) {
                    // If the uid is in ng.svg_objects, use the obj's label
                    path_item = this.netgraph.svg_objects[conn_uid_list[p]]
                        .label.innerHTML;
                } else {
                    // Otherwise, use the object's uid (with brackets to
                    // indicate that the UI is unsure of the exact label)
                    path_item = "(" + String(conn_uid_list[p]) + ")";
                }

                if (others_uid === conn_uid_list[p]) {
                    // Toggle the shading option when others_uid is reached
                    shaded_option = "";
                }

                if (p === 0) {
                    switch (obj_type) {
                    case "ens":
                        endpoint_icon = "glyphicon glyphicon-option-horizontal";
                        break;
                    case "node":
                        endpoint_icon = "glyphicon glyphicon-stop";
                        break;
                    case "passthrough":
                        endpoint_icon = "glyphicon glyphicon-share-alt";
                        break;
                    case "net":
                        endpoint_icon = "glyphicon glyphicon-list-alt";
                        break;
                    default:
                        endpoint_icon = "glyphicon glyphicon-warning-sign";
                        break;
                    }
                }

                $path_list.append(
                    "<li class='list-group-item " + shaded_option +
                        "'><span class='" + endpoint_icon + "'/>" +
                        path_item + "</li>");
            }
        }
    };

}

// Change the global defaults of the modal validator
$( document ).ready(function() {
    const $validator = $.fn.validator.Constructor.DEFAULTS;
    // Change the delay before showing errors
    $validator.delay = 5000;
    // Leave the ok button on
    $validator.disable = false;
    // Set the error messages for new validators
    $validator.errors = {my_validator: "Does not match"};
});
