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
export function clip(x: number, low: number, high: number) {
    if (x < low) {
        x = low;
    }
    if (x > high) {
        x = high;
    }
    return x;
}

export interface Shape {
    width: number;
    height: number;
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
export function draw_legend(parent, labels, colorFunc, uid) {
    // "20" is around the size of the font
    const legendSVG = d3.select(parent)
        .append("svg")
        .attr("width", 150)
        .attr("height", 20 * labels.length)
        .attr("id", "legend" + uid);

    if (labels.length === 0) {
        return legendSVG;
    }

    legendSVG.selectAll("rect")
        .data(labels)
        .enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", (d, i) => {
            return i * 20;
        }).attr("class", "legend-label")
        .attr("width", 10)
        .attr("height", 10)
        .style("fill", colorFunc);

    legendSVG.selectAll("text")
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
    const labelList = $("#legend" + uid + " .legend-label").toArray();
    const longestLabel = Math.max.apply(Math, labelList.map(o => {
        return o.getBoundingClientRect().width;
    }));
    // "50" is for the similarity measure that is around three characters wide
    legendSVG.attr("width", longestLabel + 50);

    return legendSVG;
}

/**
 * Check if a string value represents an integer.
 *
 * Short-circuits if not a number for speed reasons; see
 * http://stackoverflow.com/a/14794066/1306923.
 *
 * @param {string} value - The string to check.
 * @returns {boolean} Whether the value is a number.
 */
export function isInt(value) {
    if (isNaN(value)) {
        return false;
    }
    const num = parseFloat(value);
    return (num | 0) === num;
}


/**
 * Check if a string value represents a number.
 *
 * @param {string} value - The string to check.
 * @returns {boolean} Whether the value is a number.
 */
export function isNum(value) {
    return !(isNaN(value)) && !(value.trim() === "");
}

export function now() {
    if (window.performance && window.performance.now) {
        return window.performance.now();
    }

    if (Date.now) {
        return Date.now();
    }

    return new Date().getTime();
}

/**
 * Generate a color sequence of a given length.
 *
 * Colors are defined using a color blind-friendly palette.
 *
 * @param {number} nColors - Number of colors to generate.
 * @returns {String[]} Array of hex color strings.
 */
export function makeColors(nColors) {
    // Color blind palette with blue, green, red, magenta, yellow, cyan
    const palette = [
        "#1c73b3", "#039f74", "#d65e00", "#cd79a7", "#f0e542", "#56b4ea",
    ];
    const colors = [];

    for (let i = 0; i < nColors; i++) {
        colors.push(palette[i % palette.length]);
    }
    return colors;
}

/**
 * Gets a new unique z-index.
 *
 * @returns {number} Next unique z-index.
 */
export var nextZindex = (() => {
    let maxZindex = 0;
    return () => {
        maxZindex += 1;
        return maxZindex;
    };
})();

/**
 * Return a throttled version of a function.
 *
 * Returns a function, that, when invoked, will only be triggered at most once
 * during a given window of time. Normally, the throttled function will run
 * as much as it can, without ever going more than once per `wait` duration;
 * but if you'd like to disable the execution on the leading edge, pass
 * `{leading: false}`. To disable execution on the trailing edge, ditto.
 *
 * This function is implemented identically in lodash and underscore,
 * and is copied here under the terms of their MIT licenses.
 *
 * See http://drupalmotion.com/article/debounce-and-throttle-visual-explanation
 * for a nice explanation and visualization.
 */
export function throttle(
    func: Function,
    wait: number,
    {leading: leading = true, trailing: trailing = true} = {}
) {
    let timeout;
    let context;
    let args;
    let result;
    let previous = 0;

    const later = () => {
        previous = leading ? now() : 0;
        timeout = null;
        result = func.apply(context, args);
        if (!timeout) {
            context = args = null;
        }
    };

    const throttled: any = function() {
        const current = now();
        if (!previous && !leading) {
            previous = current;
        }
        const remaining = wait - (current - previous);
        context = this;
        args = arguments;
        if (remaining <= 0 || remaining > wait) {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
            previous = current;
            result = func.apply(context, args);
            if (!timeout) {
                context = args = null;
            }
        } else if (!timeout && trailing) {
            timeout = setTimeout(later, remaining);
        }
        return result;
    };

    throttled.cancel = () => {
        clearTimeout(timeout);
        previous = 0;
        timeout = context = args = null;
    };

    return throttled;
}

export function delay(func: Function, wait: number, ...args) {
    return setTimeout(() => {
        return func.apply(null, args);
    }, wait);
}

/**
 * Return a debounced version of a function.
 *
 * Returns a function, that, as long as it continues to be invoked, will not
 * be triggered. The function will be called after it stops being called for
 * N milliseconds. If `immediate` is passed, trigger the function on the
 * leading edge, instead of the trailing.
 *
 * This function is implemented identically in lodash and underscore,
 * and is copied here under the terms of their MIT licenses.
 *
 * See http://drupalmotion.com/article/debounce-and-throttle-visual-explanation
 * for a nice explanation and visualization.
 */
export function debounce(
    func: Function,
    wait: number,
    {immediate: immediate = false} = {}
) {
    let timeout;
    let result;

    const later = (context, args) => {
        timeout = null;
        if (args) {
            result = func.apply(context, args);
        }
    };

    const debounced: any = function(...args) {
        if (timeout) {
            clearTimeout(timeout);
        }
        if (immediate) {
            const callNow = !timeout;
            timeout = setTimeout(later, wait);
            if (callNow) {
                result = func.apply(this, args);
            }
        } else {
            timeout = delay(later, wait, this, args);
        }

        return result;
    };

    debounced.cancel = () => {
        clearTimeout(timeout);
        timeout = null;
    };

    return debounced;
}
