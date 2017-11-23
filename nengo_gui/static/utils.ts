/**
 * Miscellaneous utilities used in various parts of the Nengo GUI.
 */

import * as d3 from "d3";
import { VNode, dom, h } from "maquette";

import { InputDialogView } from "./modal";

export function handleTabs(dialog: InputDialogView) {
    dialog.input.addEventListener("keydown", event => {
        // Allow the enter key to submit
        if (event.which === 13) {
            event.preventDefault();
            dialog.ok.click();
            // Allow tabs to enter in default values
        } else if ((event.keyCode || event.which) === 9) {
            const values = dialog.input.placeholder.split(",");
            const curVal = dialog.input.value;
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
                if (curVal.length === 0 || curVal.trim().slice(-1) === ",") {
                    dialog.input.value += pre + values[curIndex].trim() + post;
                    event.preventDefault();
                } else if (curIndex < values.length) {
                    dialog.input.value += ", ";
                    event.preventDefault();
                }
            }
        }
    });
}

export function startsWith(str: string, prefix: string) {
    return str.lastIndexOf(prefix, 0) === 0;
}

export function endsWith(str: string, suffix: string) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

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
        return low;
    } else if (x > high) {
        return high;
    }
    return x;
}

export function emptyArray(length: number) {
    return Array.apply(null, new Array(length));
}

export function toArray(collection: NodeListOf<any>): Array<any> {
    return Array.prototype.slice.call(collection);
}

export interface Shape {
    width: number;
    height: number;
}

export class Rect implements ClientRect {
    bottom: number;
    left: number;
    right: number;
    top: number;

    constructor({ bottom, left, right, top }) {
        this.bottom = bottom;
        this.left = left;
        this.right = right;
        this.top = top;
    }

    get height() {
        return Math.abs(this.bottom - this.top);
    }

    get width() {
        return Math.abs(this.right - this.left);
    }
}

export function domCreateSVG(shape: VNode): SVGElement {
    return dom.create(shape, { namespace: "http://www.w3.org/2000/svg" })
        .domNode as SVGElement;
}

export function disable_editor() {
    document.getElementById("#Toggle_ace").setAttribute("display", "none");
    document.getElementById("#Save_file").setAttribute("display", "none");
    document.getElementById("#Font_increase").setAttribute("display", "none");
    document.getElementById("#Font_decrease").setAttribute("display", "none");
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
    return !isNaN(value) && !(value.trim() === "");
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
        "#1c73b3",
        "#039f74",
        "#d65e00",
        "#cd79a7",
        "#f0e542",
        "#56b4ea"
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
    { leading: leading = true, trailing: trailing = true } = {}
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
    { immediate: immediate = false } = {}
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

/**
 * Linear interpolation.
 *
 * Precise method, which guarantees v = v1 when t = 1.
 */
export function lerp(v0: number, v1: number, t: number) {
    return (1 - t) * v0 + t * v1;
}

/**
 * Angle of the vector between two points, in degrees.
 */
export function angle(x1: number, x2: number, y1: number, y2: number) {
    return Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
}

// from http://jsbin.com/yiliwu/4/edit?js,console
export function singleline(
    inStrings: TemplateStringsArray | string,
    ...values: any[]
) {
    const strings = typeof inStrings === "string" ? [inStrings] : inStrings;
    console.assert(strings.length === values.length + 1);

    // Perform interpolation.
    let output = strings[0];
    for (let i = 0; i < values.length; i++) {
        output += values[i] + strings[i + 1];
    }

    // Split on newlines.
    var lines = output.split(/(?:\r\n|\n|\r)/);

    // Rip out the leading whitespace.
    return lines
        .map(line => line.replace(/^\s+/gm, ""))
        .join(" ")
        .trim();
}

// From https://github.com/MartinKolarik/dedent-js/blob/master/src/index.ts
export function dedent(
    inStrings: TemplateStringsArray | string,
    ...values: any[]
) {
    let strings =
        typeof inStrings === "string" ? [inStrings] : inStrings.slice();
    console.assert(strings.length === values.length + 1);

    // Remove trailing whitespace.
    const last = strings.length - 1;
    strings[last] = strings[last].replace(/\r?\n([\t ]*)$/, "");

    // Find all line breaks to determine the highest common indentation level
    let matches = [];
    let match;
    for (let i = 0; i < strings.length; i++) {
        if ((match = strings[i].match(/\n[\t ]+/g))) {
            matches.push(...match);
        }
    }

    //  Remove the common indentation from all strings.
    if (matches.length) {
        let size = Math.min(...matches.map(value => value.length - 1));
        let pattern = new RegExp(`\n[\t ]{${size}}`, "g");

        strings = strings.map(s => s.replace(pattern, "\n"));
    }

    // Remove leading whitespace.
    strings[0] = strings[0].replace(/^\r?\n/, "");

    // Perform interpolation.
    let output = strings[0];
    for (let i = 0; i < values.length; i++) {
        output += values[i] + strings[i + 1];
    }

    return output;
}

/**
 * Utility functions for views.
 */

export type AlertLevel = "danger" | "info" | "success" | "warning";

export function bsAlert(text: string, level: AlertLevel = "info"): VNode {
    return h("div.alert.alert-" + level, { role: "alert" }, [
        h("p", [
            h("span.glyphicon.glyphicon-exclamation-sign", {
                "aria-hidden": true
            }),
            text
        ])
    ]);
}

export function bsActivatePopovers(parent: Element) {
    $(parent)
        .find("[data-toggle=popover]")
        .popover({ trigger: "hover" });
}

export function bsActivateTooltips(parent: Element) {
    $(parent)
        .find("[data-toggle=tooltip]")
        .tooltip();
}

export function bsPopover(
    title: string,
    content: string,
    placement = "bottom"
): VNode {
    return h(
        "a",
        {
            href: "#",
            "data-content": content,
            "data-placement": placement,
            "data-toggle": "popover",
            title: title
        },
        [h("sup", ["?"])]
    );
}

export function bsTooltip(
    content: string,
    placement: string = "bottom"
): VNode {
    return h(
        "a",
        {
            href: "#",
            "data-toggle": "tooltip",
            "data-placement": placement,
            title: content
        },
        [h("sup", ["?"])]
    );
}

/**
 * Safely sets the content of an element to the given text.
 *
 * This should be used instead of `element.innerHTML = text`.
 *
 * @param {HTMLElement} element - The element to set.
 * @param {string} text - The text to set on the element.
 */
export function safeSetText(element: HTMLElement, text: string) {
    // First remove all children
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
    element.appendChild(document.createTextNode(text));
}

function getTransformNums(element: Element) {
    let transform: string;
    if (element instanceof SVGElement) {
        transform = element.getAttribute("transform");
    } else if (element instanceof HTMLElement) {
        transform = element.style.transform;
    } else {
        console.error("'element' is not HTML or SVG");
    }

    return transform
        .replace(/[^0-9\.,]/g, "")
        .split(",")
        .map(s => Number(s));
}

export function getMatrix(element: Element): Array<number> {
    const nums = getTransformNums(element);
    console.assert(nums.length === 6);
    return nums;
}

export function getScale(element: Element): [number, number] {
    const nums = getTransformNums(element);
    if (nums.length === 2) {
        return [nums[0], nums[1]];
    } else if (nums.length === 6) {
        return [nums[0], nums[3]];
    }
}

export function getTranslate(element: Element): [number, number] {
    const nums = getTransformNums(element);
    if (nums.length === 2) {
        return [nums[0], nums[1]];
    } else if (nums.length === 6) {
        return [nums[4], nums[5]];
    }
}

/**
 * Set the transform of an element.
 *
 * @param {HTMLElement} element - The HTML element to set.
 * @param {number} x - Shift on the x-axis.
 * @param {number} y - Shift on the y-axis.
 * @param {number}
 */
function setTransform(element: Element, transform: string, nums: Number[]) {
    let unit = "";
    if (element instanceof HTMLElement) {
        unit = "px";
    }
    const sep = `${unit},`;
    const str = `${transform}(${nums.join(sep)}${unit})`;

    // let transform;
    // if (w === null && h === null) {
    //     transform = `translate(${xy})`;
    // } else {
    //     console.assert(w !== null && h !== null);
    //     transform = `matrix(${w}${unit},0,0,${h}${unit},${xy})`;
    // }

    if (element instanceof SVGElement) {
        element.setAttribute("transform", str);
    } else if (element instanceof HTMLElement) {
        element.style.webkitTransform = element.style.transform = str;
    } else {
        console.error("'element' is not HTML or SVG in 'setTransform'");
    }
}

export function setMatrix(
    element: Element,
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number
) {
    setTransform(element, "matrix", [a, b, c, d, e, f]);
}

export function setScale(element: Element, x: number, y: number = null) {
    if (y == null) {
        setTransform(element, "scale", [x]);
    } else {
        setTransform(element, "scale", [x, y]);
    }
}

export function setTranslate(element: Element, x: number, y: number) {
    setTransform(element, "translate", [x, y]);
}

export function dom2svg(element: SVGGElement, x: number, y: number) {
    // https://www.sitepoint.com/how-to-translate-from-dom-to-svg-coordinates-and-back-again/

    // TODO: do some profiling to see how slow this is compared to
    // not creating a new point and finding the parent every time
    let svg = element.parentNode as SVGElement;
    while (svg.tagName !== "svg") {
        svg = svg.parentNode as SVGGElement;
    }
    const pt = (<SVGSVGElement>svg).createSVGPoint();
    pt.x = x;
    pt.y = y;
    return pt.matrixTransform(element.getScreenCTM().inverse());
}
