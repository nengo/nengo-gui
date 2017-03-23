import * as d3 from "d3";
import { VNode, dom, h } from "maquette";

import { ModalView } from "./modal";
import * as utils from "../utils";
import * as views from "./views";

export function lines(
    x: number[],
    ys: number[][],
    xLabel: string,
    yLabel: string,
    width: number = 500,
    height: number = 220,
): SVGSVGElement {
    const margin = {bottom: 50, left: 75, right: 0, top: 10};
    const w = width - margin.left - margin.right;
    const h = height - margin.bottom - margin.top;
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

    // Create an SVG element with the desired dimensions and margin.
    const svg = d3.select(
        document.createElementNS(d3.ns.prefix["svg"], "svg")
    );
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

    return svg.node() as SVGSVGElement;
}
