import * as d3 from "d3";
import * as $ from "jquery";
import { VNode, dom, h } from "maquette";

import { config } from "./config";
import { InputDialogView, ModalView } from "./modal";
import * as utils from "./utils";
import * as tooltips from "./tooltips";

export class DetailsDialogView extends ModalView {
    contents: HTMLDivElement;
    tabs: HTMLUListElement;

    constructor() {
        super();

        const tabs = h("ul.nav.nav-tabs");

        const content = h("div.tab-content");

        this.tabs = dom.create(tabs).domNode as HTMLUListElement;
        this.contents = dom.create(content).domNode as HTMLDivElement;
        this.body.appendChild(this.tabs);
        this.body.appendChild(this.contents);
    }

    addConnectionsTab(netgraphitem, conninfo) {
        const tab = this.addTab("connections", "Connections");

        const row = (objs, getConnOther, getConnConnUidList) =>
            objs.map(obj => {
                // Get a handle to the object that we're connected to
                const connOther = getConnOther(obj);

                // Make a row in the table
                const tr = h("tr", [
                    h(
                        "td",
                        (<Array<string | VNode>>[
                            String(connOther.label.innerHTML)
                        ]).concat(
                            dropdown(
                                connOther.uid,
                                conninfo.objType[String(obj.uid)],
                                getConnConnUidList(obj)
                            )
                        )
                    ),
                    h("td", [conninfo.func[String(obj.uid)]]),
                    h("td", [
                        conninfo.fan[String(obj.uid)],
                        conninfo.objType[String(obj.uid)] === "passthrough"
                            ? utils.bsTooltip(tooltips.Conn.fan_passthrough[0])
                            : null
                    ])
                ]);
            });

        const dropdown = (uid, objType, connUidList) => {
            const nodes: VNode[] = [];
            if (connUidList.length > 1) {
                const slug = String(connUidList[0]).replace(/[\.\[\]]/g, "_");

                // Populate the list-group
                for (let p = connUidList.length - 1; p >= 0; p--) {
                    let endpointIcon = "glyphicon glyphicon-triangle-right";
                    let shadedOption = "shaded";
                    let pathItem: string;

                    const svgObjects: any = {};
                    // svgObjects = this.netgraph.svgObjects

                    if (connUidList[p] in svgObjects) {
                        // If the uid is in ng.svgObjects, use the obj's label
                        pathItem = svgObjects[connUidList[p]].label.innerHTML;
                    } else {
                        // Otherwise, use the object's uid (with brackets to
                        // indicate that the UI is unsure of the exact label)
                        pathItem = "(" + String(connUidList[p]) + ")";
                    }

                    if (uid === connUidList[p]) {
                        // Toggle the shading option when othersUid is reached
                        shadedOption = "";
                    }

                    if (p === 0) {
                        if (objType === "ens") {
                            endpointIcon =
                                "glyphicon glyphicon-option-horizontal";
                        } else if (objType === "node") {
                            endpointIcon = "glyphicon glyphicon-stop";
                        } else if (objType === "passthrough") {
                            endpointIcon = "glyphicon glyphicon-share-alt";
                        } else if (objType === "net") {
                            endpointIcon = "glyphicon glyphicon-list-alt";
                        } else {
                            endpointIcon = "glyphicon glyphicon-warning-sign";
                        }
                    }

                    nodes.push(
                        h("li.list-group-item." + shadedOption, [
                            h("span." + endpointIcon),
                            pathItem
                        ])
                    );
                }

                nodes.push(
                    h(
                        "a",
                        {
                            "aria-expanded": false,
                            "data-toggle": "collapse",
                            href: "#pathlist" + slug
                        },
                        [utils.bsTooltip(tooltips.Conn.expand[0], "right")]
                    )
                );

                nodes.push(
                    h("div.collapse#pathlist" + slug, [
                        h("ul.list-group", [
                            h("li.list-group-item.shaded", [
                                h("span.glyphicon.glyphicon-home"),
                                "Model"
                            ]),
                            nodes
                        ])
                    ])
                );
            }

            return nodes;
        };

        const connInObjs = netgraphitem.connIn;
        if (connInObjs.length > 0) {
            const section = h("h3", ["Incoming connections"]);

            const table = h("table.table.table-condensed", [
                h("tr", [
                    h("th.conn-objs", [
                        "Object",
                        utils.bsPopover(
                            "'Pre' object",
                            "This object plays the role of 'Pre' in the " +
                                "connection to this object.",
                            "top"
                        )
                    ]),
                    h("th.conn-funcs", [
                        "Function",
                        utils.bsPopover(
                            "Connection function",
                            "The function being computed across this " +
                                "connection (in vector space).",
                            "top"
                        )
                    ]),
                    h("th.conn-fan", [
                        "Fan in",
                        utils.bsPopover(
                            "Neuron fan-in",
                            "The number of incoming neural connections. " +
                                "In biological terms, this is the " +
                                "maximum number of synapses in the " +
                                "dendritic tree of a single neuron in " +
                                "this object, resulting from this " +
                                "connection. The total number of " +
                                "synapses would be the sum of the " +
                                "non-zero numbers in this column.",
                            "top"
                        )
                    ])
                ]),
                row(connInObjs, connObj => connObj.pre, connObj => connObj.pres)
            ]);
            tab.appendChild(dom.create(section).domNode);
            tab.appendChild(dom.create(table).domNode);
        }

        const connOutObjs = netgraphitem.connOut;
        if (connOutObjs.length > 0) {
            if (connInObjs.length > 0) {
                tab.appendChild(dom.create(h("hr")).domNode);
            }
            const section = h("h3", ["Outgoing connections"]);
            const table = h("table.table.table-condensed", [
                h("tr", [
                    h("th.conn-objs", [
                        "Object",
                        utils.bsPopover(
                            "'Post' object",
                            "This object plays the role of 'Post' in " +
                                "the connection from this object.",
                            "top"
                        )
                    ]),
                    h("th.conn-funcs", [
                        "Function",
                        utils.bsPopover(
                            "Connection function",
                            "The function being computed across this " +
                                "connection (in vector space).",
                            "top"
                        )
                    ]),
                    h("th.conn-fan", [
                        "Fan out",
                        utils.bsPopover(
                            "Neuron fan-out",
                            "The number of outgoing neural connections. " +
                                "In biological terms, this is the " +
                                "maximum number of synapses from axon " +
                                "terminals of a single neuron in this " +
                                "object, resulting from this " +
                                "connection. The total number of " +
                                "synapses would be the sum of the " +
                                "non-zero numbers in this column.",
                            "top"
                        )
                    ])
                ]),
                row(
                    connOutObjs,
                    connObj => connObj.post,
                    connObj => connObj.posts
                )
            ]);

            tab.appendChild(dom.create(section).domNode);
            tab.appendChild(dom.create(table).domNode);
        }

        if (connInObjs.length === 0 && connOutObjs.length === 0) {
            let warntext = "No connections to or from this object.";
            if (netgraphitem.type === "net" && netgraphitem.expanded) {
                warntext =
                    "Network is expanded. Please see individual " +
                    "objects for connection info.";
            }

            const warn = utils.bsAlert("Warning: " + warntext, "warning");
            tab.appendChild(dom.create(warn).domNode);
        }

        return tab;
    }

    addParamTab(params, strings) {
        const tab = this.addTab("params", "Parameters");

        const node = h(
            "dl.dl-horizontal",
            [].concat.apply(
                [],
                params.map(param => [
                    h("dt", [
                        param[0],
                        utils.bsTooltip(param[0], strings[param[0]])
                    ]),
                    h("dd", [param[1]])
                ])
            )
        );
        tab.appendChild(dom.create(node).domNode);

        return tab;
    }

    addPlotsTab(plots) {
        const tab = this.addTab("plots", "Plots");

        // This indicates an error (usually no sim running)
        if (typeof plots === "string") {
            const err = utils.bsAlert("Error: " + plots, "danger");
            tab.appendChild(dom.create(err).domNode);
        } else {
            plots.forEach(plot => {
                const section = h("h4", [plot.title]);
                plot.warnings.forEach(warn =>
                    utils.bsAlert("Warning: " + warn, "warning")
                );
                if (plot.plot === "multiline") {
                    tab.appendChild(
                        lines(plot.x, plot.y, plot.xLabel, plot.yLabel)
                    );
                } else if (plot.plot !== "none") {
                    console.warn(
                        "Plot type " +
                            plot.plot +
                            " not understood or not implemented yet."
                    );
                }
            });
        }

        return tab;
    }

    addTab(id: string, label: string): HTMLDivElement {
        const tab = h("li", [
            h("a", { href: "#" + id, "data-toggle": "tab" }, [label])
        ]);

        const node = h("div.tab-pane#" + id);

        const firstTab = this.tabs.childElementCount === 0;

        this.tabs.appendChild(dom.create(tab).domNode);
        const content = dom.create(node).domNode as HTMLDivElement;
        this.contents.appendChild(content);
        return content;
    }

    show() {
        // If nothing set as active, set the first tab as active
        if (this.tabs.querySelector(".active") === null) {
            (<HTMLElement>this.tabs.firstChild).classList.add("active");
            (<HTMLElement>this.contents.firstChild).classList.add("active");
        }

        // Activate all tooltips and popovers
        utils.bsActivateTooltips(this.body);
        utils.bsActivatePopovers(this.body);
        super.show();
    }
}

export class EnsembleDialogView extends DetailsDialogView {
    connections: HTMLDivElement;
    params: HTMLDivElement;
    plots: HTMLDivElement;

    constructor() {
        super();

        this.params = this.addParamTab(null, null);
        this.plots = this.addPlotsTab(null);
        this.connections = this.addConnectionsTab(null, null);
    }
}

export class NodeDialogView extends DetailsDialogView {
    connections: HTMLDivElement;
    params: HTMLDivElement;
    plots: HTMLDivElement;

    constructor() {
        super();

        this.params = this.addParamTab(null, null);
        this.plots = this.addPlotsTab(null);
        this.connections = this.addConnectionsTab(null, null);
    }
}

export class NetworkDialogView extends DetailsDialogView {
    connections: HTMLDivElement;
    stats: HTMLDivElement;

    constructor() {
        super();

        this.stats = this.addStatisticsTab(null);
        this.connections = this.addConnectionsTab(null, null);
    }

    addStatisticsTab(stats): HTMLDivElement {
        const tab = this.addTab("stats", "Statistics");

        stats.forEach(stat => {
            const section = h("h3", [stat.title]);
            const table = h(
                "table.table.table-condensed.table-hover",
                stat.stats.map(statstat =>
                    h("tr", [
                        h("td.col-md-8", [statstat[0]]),
                        h("td.col-md-4", [statstat[1]])
                    ])
                )
            );
            tab.appendChild(dom.create(section).domNode);
            tab.appendChild(dom.create(table).domNode);
        });

        return tab;
    }
}

export function lines(
    x: number[],
    ys: number[][],
    xLabel: string,
    yLabel: string,
    width: number = 500,
    height: number = 220
): SVGSVGElement {
    const margin = { bottom: 50, left: 75, right: 0, top: 10 };
    const w = width - margin.left - margin.right;
    const h = height - margin.bottom - margin.top;
    const graphW = w + margin.left + margin.right;
    const graphH = h + margin.bottom + margin.top;
    const textOffset = 15;

    const scaleX = d3.scale
        .linear()
        .domain([x[0], x[x.length - 1]])
        .range([margin.left, w - margin.right]);
    const scaleY = d3.scale
        .linear()
        .domain([
            d3.min(ys, y => {
                return d3.min(y);
            }) - 0.01,
            d3.max(ys, y => {
                return d3.max(y);
            }) + 0.01
        ])
        .range([h + margin.top, margin.top]);

    // Create an SVG element with the desired dimensions and margin.
    const svg = d3.select(document.createElementNS(d3.ns.prefix["svg"], "svg"));
    const graph = svg.attr("width", graphW).attr("height", graphH);

    // Create the axes
    const xAxis = d3.svg
        .axis()
        .scale(scaleX)
        .orient("bottom")
        .ticks(9);
    graph
        .append("g")
        .attr("class", "axis axisX unselectable")
        .attr("transform", "translate(0," + (h + margin.top) + ")")
        .call(xAxis);

    const yAxisLeft = d3.svg
        .axis()
        .scale(scaleY)
        .ticks(5)
        .orient("left");
    graph
        .append("g")
        .attr("class", "axis axisY unselectable")
        .attr("transform", "translate(" + margin.left + ",0)")
        .call(yAxisLeft);

    // Label the axes
    if (xLabel !== "") {
        svg
            .append("text")
            .attr("class", "x label")
            .attr("text-anchor", "middle")
            .attr("x", graphW / 2)
            .attr("y", textOffset + graphH - margin.bottom / 2)
            .text(xLabel);
    }

    if (yLabel !== "") {
        svg
            .append("text")
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

    const line = d3.svg
        .line<number>()
        .x((d, i) => {
            return scaleX(x[i]);
        })
        .y(d => {
            return scaleY(d);
        });

    graph
        .append("g")
        .selectAll("path")
        .data(ys)
        .enter()
        .append("path")
        .attr("d", line)
        .attr("class", "line")
        .style("stroke", (d, i) => {
            return colors[i];
        });

    return svg.node() as SVGSVGElement;
}
