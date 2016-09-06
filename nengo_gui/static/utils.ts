/**
 * Miscellaneous utilities used in various parts of the Nengo GUI.
 */

import * as d3 from "d3";
import * as $ from "jquery";

/**
 * Clip a number, keeping it between two values.
 *
 * @param {number} x - Number to clip.
 * @param {number} low - Low end of range.
 * @param {number} high - High end of range.
 * @returns {number} The clipped result.
 */
export function clip(x, low, high) {
    if (x < low) {
        x = low;
    }
    if (x > high) {
        x = high;
    }
    return x;
}

/**
 * Create a WebSocket connection to the given uid.
 *
 * @param {string} uid - The uid for the WebSocket.
 * @returns {WebSocket} The created WebSocket.
 */
export function create_websocket(uid) {
    const parser = document.createElement("a");
    parser.href = document.URL;
    let ws_proto;
    if (window.location.protocol === "https:") {
        ws_proto = "wss:";
    } else {
        ws_proto = "ws:";
    }
    const ws_url = ws_proto + "//" + parser.host + "/viz_component?uid=" + uid;
    const ws = new WebSocket(ws_url);
    ws.binaryType = "arraybuffer";
    return ws;
}

export function disable_editor() {
    $("#Toggle_ace").css("display", "none");
    $("#Save_file").css("display", "none");
    $("#Font_increase").css("display", "none");
    $("#Font_decrease").css("display", "none");
}

/**
 * Draw a legend.
 *
 * @param {HTMLElement} parent - The parent element.
 * @param {string[]} labels - Legend labels.
 * @param {function} color_func - Function to choose colors.
 * @param {string} uid - uid associated with the Value component.
 * @returns {SVGElement} The created SVG element.
 */
export function draw_legend(parent, labels, color_func, uid) {
    // "20" is around the size of the font
    const legend_svg = d3.select(parent)
        .append("svg")
        .attr("width", 150)
        .attr("height", 20 * labels.length)
        .attr("id", "legend" + uid);

    if (labels.length === 0) {
        return legend_svg;
    }

    legend_svg.selectAll("rect")
        .data(labels)
        .enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", (d, i) => {
            return i * 20;
        }).attr("class", "legend-label")
        .attr("width", 10)
        .attr("height", 10)
        .style("fill", color_func);

    legend_svg.selectAll("text")
        .data(labels)
        .enter()
        .append("text")
        .attr("x", 15)
        .attr("y", (d, i) => {
            return i * 20 + 9;
        }).attr("class", "legend-label")
        .text((d, i) => { // TODO: ensure html and text give same result
            return labels[i];
        });

    // Expand the width of the svg to the length of the longest string
    const label_list = $("#legend" + uid + " .legend-label").toArray();
    const longest_label = Math.max.apply(Math, label_list.map(o => {
        return o.getBBox().width;
    }));
    // "50" is for the similarity measure that is around three characters wide
    const svg_right_edge = longest_label + 50;
    legend_svg.attr("width", svg_right_edge);

    return legend_svg;
}

/**
 * Check if a string value represents a number.
 *
 * @param {string} value - The string to check.
 * @returns {boolean} Whether the value is a number.
 */
export function is_num(value) {
    return !(isNaN(value)) && !(value.trim() === "");
}

/**
 * Generate a color sequence of a given length.
 *
 * Colors are defined using a color blind-friendly palette.
 *
 * @param {number} n_colors - Number of colors to generate.
 * @returns {String[]} Array of hex color strings.
 */
export function make_colors(n_colors) {
    // Color blind palette with blue, green, red, magenta, yellow, cyan
    const palette = [
        "#1c73b3", "#039f74", "#d65e00", "#cd79a7", "#f0e542", "#56b4ea",
    ];
    const colors = [];

    for (let i = 0; i < n_colors; i++) {
        colors.push(palette[i % palette.length]);
    }
    return colors;
}

/**
 * Gets a new unique z-index.
 *
 * @returns {number} Next unique z-index.
 */
export var next_zindex = (() => {
    let max_zindex = 0;
    return () => {
        max_zindex += 1;
        return max_zindex;
    };
})();

/**
 * Safely sets the content of an element to the given text.
 *
 * This should be used instead of `element.innerHTML = text`.
 *
 * @param {HTMLElement} element - The element to set.
 * @param {string} text - The text to set on the element.
 */
export function safe_set_text(element, text) {
    // First remove all children
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
    element.appendChild(document.createTextNode(text));
}

/**
 * Set the transform of an element.
 *
 * @param {HTMLElement} element - The HTML element to set.
 * @param {number} x - Shift on the x-axis.
 * @param {number} y - Shift on the y-axis.
 */
export function set_transform(element, x, y) {
    element.style.webkitTransform =
        element.style.transform = "translate(" + x + "px, " + y + "px)";
}
