import * as d3 from "d3";
import * as $ from "jquery";

import * as allComponents from "./components/all-components";
import { config } from "./config";
import { Hotkeys } from "./hotkeys";
import "./modal.css";
import * as tooltips from "./tooltips";
import * as utils from "./utils";
import { ModalView } from "./views/modal";

export class Modal {
    $body;
    $div;
    $footer;
    $title;
    editor;
    hotkeys;
    netgraph;
    sim;
    simWasRunning;
    toolbar;
    view: ModalView = null; // Created in this.show

    constructor($div, editor, sim) {
        // this.$div = $div;
        // this.$title = this.$div.find(".modal-title").first();
        // this.$footer = this.$div.find(".modal-footer").first();
        // this.$body = this.$div.find(".modal-body").first();
        this.editor = editor;
        this.sim = sim;
        this.netgraph = this.editor.netgraph;
        this.hotkeys = new Hotkeys(this.editor, this);

        this.simWasRunning = false;

        // This listener is triggered when the modal is closed
        this.$div.on("hidden.bs.modal", function() {
            if (this.simWasRunning) {
                this.sim.play();
            }
            this.hotkeys.setActive(true);
        });
    }

    show() {
        this.hotkeys.setActive(false);
        this.simWasRunning = !this.sim.paused;
        this.sim.pause();
        this.view = new ModalView();
        this.view.show();
    }

    // title(title) {
    //     this.$title.text(title);
    // }

    footer(type, okFunction, cancelFunction) {
        this.$footer.empty();

        if (type === "close") {
            this.$footer.append(
                "<button type='button' class='btn btn-default'" +
                    " data-dismiss='modal'>Close</button>");
        } else if (type === "okCancel") {
            const $footerBtn = $("<div class='form-group'/>")
                .appendTo(this.$footer);
            $footerBtn.append("<button id='cancel-button' type='button' " +
                              "class='btn btn-default'>Cancel</button>");
            $footerBtn.append("<button id='OK' type='submit' " +
                              "class='btn btn-primary'>OK</button>");
            $("#OK").on("click", okFunction);
            if (typeof cancelFunction !== "undefined") {
                $("#cancel-button").on("click", cancelFunction);
            } else {
                $("#cancel-button").on("click", () => {
                    $("#cancel-button").attr("data-dismiss", "modal");
                });
            }
        } else if (type === "confirmReset") {
            this.$footer.append("<button type='button' " +
                                "id='confirmResetButton' " +
                                "class='btn btn-primary'>Reset</button>");
            this.$footer.append("<button type='button' " +
                                "class='btn btn-default' " +
                                "data-dismiss='modal'>Close</button>");
            $("#confirmResetButton").on("click", function() {
                this.toolbar.resetModelLayout();
            });
        } else if (type === "confirmSavepdf") {
            this.$footer.append(
                "<button type='button' " +
                    "id='confirmSavepdfButton' class='btn btn-primary' " +
                    "data-dismiss='modal'>Save</button>");
            this.$footer.append("<button type='button' " +
                                "class='btn btn-default' " +
                                "data-dismiss='modal'>Close</button>");
            $("#confirmSavepdfButton").on("click", () => {
                const svg = $("#main svg")[0];

                // Serialize SVG as XML
                const svgXml = (new XMLSerializer()).serializeToString(svg);
                let source = "<?xml version='1.0' standalone='no'?>" + svgXml;
                source = source.replace("&lt;", "<");
                source = source.replace("&gt;", ">");

                const svgUri = "data:image/svg+xml;base64," + btoa(source);

                // Extract filename from the path
                const path = $("#filename")[0].textContent;
                let filename = path.split("/").pop();
                filename = filename.split(".")[0];

                // Initiate download
                const link = document.createElement("a");
                // Experimental future feature; uncomment when finalized.
                // link.download = filename + ".svg";
                link.href = svgUri;

                // Adding element to the DOM (needed for Firefox)
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
        } else if (type === "confirmSavecsv") {
            this.$footer.append(
                "<button type='button' " +
                    "id='confirmSavecsvButton' class='btn btn-primary' " +
                    "data-dismiss='modal'>Save</button>");
            this.$footer.append("<button type='button' " +
                                "class='btn btn-default' " +
                                "data-dismiss='modal'>Close</button>");
            $("#confirmSavecsvButton").on("click", () => {

                const csv = allComponents.toCSV();
                // Extract filename from the path
                const path = $("#filename")[0].textContent;
                let filename = path.split("/").pop();
                filename = filename.split(".")[0];

                const uri =
                    "data:text/csv;charset=utf-8," + encodeURIComponent(csv);

                const link = document.createElement("a");
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
                                "id='refreshButton' " +
                                "class='btn btn-primary'>Refresh</button>");
            $("#refreshButton").on("click", () => {
                location.reload();
            });
        } else {
            console.warn("Modal footer type " + type + " not recognized.");
        }
    }

    clearBody() {
        this.$body.empty();
        this.$div.find(".modal-dialog").removeClass("modal-sm");
        this.$div.off("shown.bs.modal");
    }

    textBody(text, type = "info") {
        this.clearBody();
        const $alert = $("<div class='alert alert-" + type + "' role='alert'/>")
            .appendTo(this.$body);
        const $p = $("<p/>").appendTo($alert);
        $p.append("<span class='glyphicon glyphicon-exclamation-sign' " +
                  "aria-hidden='true'></span>");
        $p.append(document.createTextNode(text));
    }

    helpBody() {
        this.clearBody();

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
    }

    /**
     * Sets up the tabs for Info modals.
     */
    tabbedBody(tabinfo) {
        this.clearBody();
        const tabdivs = {};
        const $tabUl = $("<ul class='nav nav-tabs'/>").appendTo(this.$body);
        const $content = $("<div class='tab-content'/>").appendTo(this.$body);

        for (let i = 0; i < tabinfo.length; i++) {
            // <li> for the tab label
            const $tabLi = $("<li/>").appendTo($tabUl);
            $tabLi.append("<a href='#" + tabinfo[i].id +
                           "' data-toggle='tab'>" +
                           tabinfo[i].title + "</a>");

            // <div> for the tab content
            tabdivs[tabinfo[i].id] = $(
                "<div class='tab-pane' id='" + tabinfo[i].id + "'/>")
                .appendTo($content);
            if (i === 0) {
                $tabLi.addClass("active");
                tabdivs[tabinfo[i].id].addClass("active");
            }
        }
        return tabdivs;
    }

    /**
     * Sets up the body for main configuration.
     */
    mainConfig() {
        this.clearBody();

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
          this.sim.simulatorOptions +
          "</select>" +
          "</div>" +
          "</div>").appendTo($form);

        this.$div.on("shown.bs.modal", () => {
            $("#config-fontsize").focus();
        });
        $("#zoom-fonts").prop("checked", this.netgraph.zoomFonts);
        $("#zoom-fonts").change(function() {
            this.netgraph.zoomFonts = $("#zoom-fonts").prop("checked");
        });

        $("#aspect-resize").prop("checked", this.netgraph.aspectResize);
        $("#aspect-resize").change(function() {
            this.netgraph.aspectResize = $("#aspect-resize").prop("checked");
        });

        $("#transparent-nets").prop("checked", this.netgraph.transparentNets);
        $("#transparent-nets").change(function() {
            this.netgraph.transparentNets =
                $("#transparent-nets").prop("checked");
        });

        $("#sync-editor").prop("checked", this.editor.autoUpdate);
        $("#sync-editor").change(function() {
            this.editor.autoUpdate = $("#sync-editor").prop("checked");
            this.editor.updateTrigger = $("#sync-editor").prop("checked");
        });

        $("#config-fontsize").val(this.netgraph.fontSize);
        $("#config-fontsize").bind("keyup input", function() {
            this.netgraph.fontSize = parseInt($("#config-fontsize").val(), 10);
        });
        $("#config-fontsize").attr("data-myValidator", "custom");

        let sd = config.scriptdir;
        if (sd === ".") {
            sd = "";
        }
        $("#config-scriptdir").val(sd);
        $("#config-scriptdir").bind("keyup input", () => {
            let newsd = $("#config-scriptdir").val();
            if (!newsd) {
                newsd = ".";
            }
            config.scriptdir = newsd;
        });

        $("#config-backend").change(function() {
            this.sim.setBackend($("#config-backend").val());
        });

        // Allow the enter key to submit
        const submit = event => {
            if (event.which === 13) {
                event.preventDefault();
                $("#OK").click();
            }
        };
        $("#config-fontsize").keypress(submit);
        $("#config-scriptdir").keypress(submit);
    }

    /**
     * Sets up the body for standard input forms.
     */
    singleInputBody(startValues, label) {
        this.clearBody();

        const $form = $("<form class='form-horizontal' id ='myModalForm'/>")
            .appendTo(this.$body);
        const $ctrlg = $("<div class='form-group'/>").appendTo($form);
        $ctrlg.append("<label class='control-label' for='singleInput'>" +
                      label + "</label>");
        const $ctrls = $("<div class='controls'/>").appendTo($ctrlg);
        $ctrls.append("<input id='singleInput' type='text' placeholder='" +
                      startValues + "'/>");
        $("<div class='help-block with-errors'/>").appendTo($ctrls);
        this.$div.on("shown.bs.modal", () => {
            $("#singleInput").focus();
        });

        // Add custom validator
        $("#singleInput").attr("data-myValidator", "custom");

        $(".controls").on("keydown", "#singleInput", event => {
            // Allow the enter key to submit
            if (event.which === 13) {
                event.preventDefault();
                $("#OK").click();
            }
            // Allow tabs to enter in default values
            if ((event.keyCode || event.which) === 9) {
                const values = $("#singleInput").attr("placeholder").split(",");
                const curVal = $("#singleInput").val();
                let curIndex = curVal.split(",").length - 1;
                let pre = " "; // Space and possible comma before value
                let post = ","; // Possible comma after value

                // Only do special things if there are more values to enter
                if (curIndex < values.length) {
                    // Compute the correct current index
                    if (curVal.length > 0) {
                        if (curVal.trim().slice(-1) !== ",") {
                            curIndex += 1;
                            pre = ", "; // Need a comma as well between values
                        }
                    } else {
                        pre = ""; // No space for the first value
                    }
                    if (curIndex === values.length - 1) {
                        post = "";
                    }
                    // If the last character is a comma or there are no
                    // characters, fill in the next default value
                    if (curVal.length === 0 ||
                            curVal.trim().slice(-1) === ",") {
                        $("#singleInput").val(
                            $("#singleInput").val() + pre +
                                values[curIndex].trim() + post);
                        event.preventDefault();
                    } else {
                        if (curIndex < values.length) {
                            $("#singleInput")
                                .val($("#singleInput").val() + ", ");
                            event.preventDefault();
                        }
                    }
                }
            }
        });
    }

    ensembleBody(uid, params, plots, conninfo) {
        const tabs = this.tabbedBody([
            {id: "params", title: "Parameters"},
            {id: "plots", title: "Plots"},
            {id: "connections", title: "Connections"}]);
        this.renderParams(tabs["params"], params, tooltips.Ens); // tslint:disable-line
        this.renderPlots(tabs["plots"], plots); // tslint:disable-line
        this.renderConnections(tabs["connections"], uid, conninfo); // tslint:disable-line
    }

    nodeBody(uid, params, plots, conninfo) {
        const tabs: any = this.tabbedBody([
            {id: "params", title: "Parameters"},
            {id: "plots", title: "Plots"},
            {id: "connections", title: "Connections"},
        ]);
        this.renderParams(tabs.params, params, tooltips.Node);
        this.renderPlots(tabs.plots, plots);
        this.renderConnections(tabs.connections, uid, conninfo);
    }

    netBody(uid, stats, conninfo) {
        const tabs: any = this.tabbedBody([
            {id: "stats", title: "Statistics"},
            {id: "connections", title: "Connections"},
        ]);
        this.renderStats(tabs.stats, stats);
        this.renderConnections(tabs.connections, uid, conninfo);
    }

    /**
     * Renders information about the parameters of an object.
     */
    renderParams($parent, params, strings) {
        const $plist = $("<dl class='dl-horizontal'/>").appendTo($parent);
        for (let i = 0; i < params.length; i++) {
            const $dt = $("<dt/>").appendTo($plist);
            $dt.text(params[i][0]);

            const $dd = $("<dd/>").appendTo($plist);
            $dd.text(params[i][1]);
            tooltips.popover($dt, params[i][0], strings[params[i][0]]);
        }
    }

    /**
     * Renders information about some statistics of an object.
     */
    renderStats($parent, stats) {
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
    }

    /**
     * Renders information about plots related to an object.
     */
    renderPlots($parent, plots) {
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
                this.renderPlot($parent, plots[i]);
            }
        }
    }

    /**
     * Renders information about a single plot.
     */
    renderPlot($parent, plotinfo) {
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
            this.multilinePlot(
                $parent.get(0),
                plotinfo.x,
                plotinfo.y,
                plotinfo.xLabel,
                plotinfo.yLabel);
        } else if (plotinfo.plot !== "none") {
            console.warn("Plot type " + plotinfo.plot +
                         " not understood, or not implemented yet.");
        }
    }

    /**
     * Static multiline plot with shared x-axis
     *
     * @param {string} selector - Where the svg will be added
     * @param {float[]} x - The shared x-axis
     * @param {float[][]} ys - The y data for each line
     */
    multilinePlot(selector, x, ys: number[][], xLabel, yLabel) {

        const margin = {bottom: 50, left: 75, right: 0, top: 10};
        const w = 500 - margin.left - margin.right;
        const h = 220 - margin.bottom - margin.top;
        const graphW = w + margin.left + margin.right;
        const graphH = h + margin.bottom + margin.top;
        const textOffset = 15;

        const scaleX = d3.scale.linear()
            .domain([x[0], x[x.length - 1]])
            .range([margin.left, w - margin.right]);
        const scaleY = d3.scale.linear()
            .domain([d3.min(ys, y => {
                return d3.min(y);
            }) - 0.01, d3.max(ys, y => {
                return d3.max(y);
            }) + 0.01])
            .range([h + margin.top, margin.top]);

        // Add an SVG element with the desired dimensions and margin.
        const svg = d3.select(selector).append("svg");
        const graph = svg.attr("width", graphW).attr("height", graphH);

        // Create the axes
        const xAxis = d3.svg.axis()
            .scale(scaleX)
            .orient("bottom")
            .ticks(9);
        graph.append("g")
            .attr("class", "axis axisX unselectable")
            .attr("transform", "translate(0," + (h + margin.top) + ")")
            .call(xAxis);

        const yAxisLeft = d3.svg.axis()
            .scale(scaleY)
            .ticks(5)
            .orient("left");
        graph.append("g")
            .attr("class", "axis axisY unselectable")
            .attr("transform", "translate(" + margin.left + ",0)")
            .call(yAxisLeft);

        // Label the axes
        if (xLabel !== "") {
            svg.append("text")
                .attr("class", "x label")
                .attr("text-anchor", "middle")
                .attr("x", graphW / 2)
                .attr("y", textOffset + graphH - margin.bottom / 2)
                .text(xLabel);
        }

        if (yLabel !== "") {
            svg.append("text")
                .attr("class", "y label")
                .attr("text-anchor", "middle")
                .attr("x", -graphH / 2)
                .attr("y", -textOffset + margin.left / 2)
                .attr("dy", ".75em")
                .attr("transform", "rotate(-90)")
                .text(yLabel);
        }

        // Add the lines
        const colors = utils.makeColors(ys.length);

        const line = d3.svg.line<number>()
            .x((d, i) => {
                return scaleX(x[i]);
            }).y(d => {
                return scaleY(d);
            });

        graph.append("g")
            .selectAll("path")
            .data(ys)
            .enter()
            .append("path")
            .attr("d", line)
            .attr("class", "line")
            .style("stroke", (d, i) => {
                return colors[i];
            });
    }

    /**
     * Renders information about connections related to an object.
     */
    renderConnections($parent, uid, conninfo) {
        const ngi = this.netgraph.svgObjects[uid];
        const connInObjs = ngi.connIn;
        if (connInObjs.length > 0) {
            $parent.append("<h3>Incoming Connections</h3>");

            const $connInTable =
                $("<table class='table table-condensed'><tr>" +
                  "<th class='conn-objs'>Object</th>" +
                  "<th class='conn-funcs'>Function</th>" +
                  "<th class='conn-fan'>Fan In</th></tr>")
                .appendTo($parent);
            tooltips.popover($connInTable.find(".conn-objs").first(),
                             "'Pre' object",
                             "This object plays the role of 'Pre' in the " +
                             "connection to this object.",
                             "top");
            tooltips.popover($connInTable.find(".conn-funcs").first(),
                             "Connection function",
                             "The function being computed across this " +
                             "connection (in vector space).",
                             "top");
            tooltips.popover($connInTable.find(".conn-fan").first(),
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

            this.makeConnectionsTableRow(
                $connInTable, conninfo, connInObjs,
                connObj => {
                    return connObj.pre;
                }, connObj => {
                    return connObj.pres;
                });
        }

        const connOutObjs = ngi.connOut;
        if (connOutObjs.length > 0) {
            if (connInObjs.length > 0) {
                $parent.append("<hr/>");
            }
            $parent.append("<h3>Outgoing Connections</h3>");

            const $connOutTable =
                $("<table class='table table-condensed'><tr>" +
                  "<th class='conn-objs'>Object</th>" +
                  "<th class='conn-funcs'>Function</th>" +
                  "<th class='conn-fan'>Fan Out</th></tr>")
                .appendTo($parent);

            tooltips.popover($connOutTable.find(".conn-objs").first(),
                             "'Post' object",
                             "This object plays the role of 'Post' in the " +
                             "connection from this object.",
                             "top");
            tooltips.popover($connOutTable.find(".conn-funcs").first(),
                             "Connection function",
                             "The function being computed across this " +
                             "connection (in vector space).",
                             "top");
            tooltips.popover($connOutTable.find(".conn-fan").first(),
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

            this.makeConnectionsTableRow(
                $connOutTable, conninfo, connOutObjs,
                connObj => {
                    return connObj.post;
                },
                connObj => {
                    return connObj.posts;
                });
        }

        if (connInObjs.length === 0 && connOutObjs.length === 0) {
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
    }

    /**
     * Generates one row in the connections table in the connections tab.
     */
    makeConnectionsTableRow(
        $table, conninfo, connObjs, getConnOther, getConnConnUidList) {
        for (let i = 0; i < connObjs.length; i++) {
            // Get a handle to the object that we're connected to
            const connOther = getConnOther(connObjs[i]);

            // Make a row in the table
            const $tr = $("<tr/>").appendTo($table);

            // Make the objects column
            const $objsTd = $("<td>" + String(connOther.label.innerHTML) +
                             "</td>").appendTo($tr);
            this.makeConnPathDropdownList(
                $objsTd,
                connOther.uid,
                conninfo.objType[String(connObjs[i].uid)],
                getConnConnUidList(connObjs[i]));

            // Make the functions column
            const $funcTd = $("<td/>").appendTo($tr);
            $funcTd.text(conninfo.func[String(connObjs[i].uid)]);

            // Make the fan data column
            const $fanTd = $("<td>" +
                            conninfo.fan[String(connObjs[i].uid)] + "</td>")
                .appendTo($tr);
            if (conninfo.objType[String(connObjs[i].uid)] === "passthrough") {
                tooltips.tooltip($fanTd, tooltips.Conn.fan_passthrough);
            }
        }
    }

    /**
     * Generates the connection path dropdown list for the connections tab.
     */
    makeConnPathDropdownList(
        $container, othersUid, objType, connUidList) {
        if (connUidList.length > 1) {
            // Add expand control and the tooltip to the <dd> object
            const $lgHeader =
                $("<a data-toggle='collapse' href='#pathlist" +
                  String(connUidList[0]).replace(/[\.\[\]]/g, "_") +
                  "' aria-expanded='false'/>").appendTo($container);

            // Make the "expand down" tooltip
            tooltips.tooltip($lgHeader, tooltips.Conn.expand, "right");

            // Make a list-group for the drop down items
            const $pathList = $("<ul class='list-group'>")
                .appendTo($("<div class='collapse' id='pathlist" +
                            String(connUidList[0]).replace(/[\.\[\]]/g, "_") +
                            "'/>")
                          .appendTo($container));

            // Add the root "Model" item to the drop down list
            $pathList.append(
                "<li class='list-group-item shaded'>" +
                    "<span class='glyphicon glyphicon-home'/>Model</a>");

            // Populate the list-group
            let shadedOption = "shaded";
            let endpointIcon = "glyphicon glyphicon-triangle-right";
            let pathItem: string;
            for (let p = connUidList.length - 1; p >= 0; p--) {
                if (connUidList[p] in this.netgraph.svgObjects) {
                    // If the uid is in ng.svgObjects, use the obj's label
                    pathItem = this.netgraph.svgObjects[connUidList[p]]
                        .label.innerHTML;
                } else {
                    // Otherwise, use the object's uid (with brackets to
                    // indicate that the UI is unsure of the exact label)
                    pathItem = "(" + String(connUidList[p]) + ")";
                }

                if (othersUid === connUidList[p]) {
                    // Toggle the shading option when othersUid is reached
                    shadedOption = "";
                }

                if (p === 0) {
                    switch (objType) {
                    case "ens":
                        endpointIcon = "glyphicon glyphicon-option-horizontal";
                        break;
                    case "node":
                        endpointIcon = "glyphicon glyphicon-stop";
                        break;
                    case "passthrough":
                        endpointIcon = "glyphicon glyphicon-share-alt";
                        break;
                    case "net":
                        endpointIcon = "glyphicon glyphicon-list-alt";
                        break;
                    default:
                        endpointIcon = "glyphicon glyphicon-warning-sign";
                        break;
                    }
                }

                $pathList.append(
                    "<li class='list-group-item " + shadedOption +
                        "'><span class='" + endpointIcon + "'/>" +
                        pathItem + "</li>");
            }
        }
    }

}

// Change the global defaults of the modal validator
$( document ).ready(() => {
    const $validator = $.fn.validator.Constructor.DEFAULTS;
    // Change the delay before showing errors
    $validator.delay = 5000;
    // Leave the ok button on
    $validator.disable = false;
    // Set the error messages for new validators
    $validator.errors = {myValidator: "Does not match"};
});
