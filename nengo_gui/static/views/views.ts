/**
 * Utility functions for views.
 */

import { VNode, h } from "maquette";

import * as utils from "../utils";

export type AlertLevel = "danger" | "info" | "success" | "warning";

export function bsAlert(text: string, level: AlertLevel = "info"): VNode {
    return h("div.alert.alert-" + level, {role: "alert"}, [
        h("p", [
            h("span.glyphicon.glyphicon-exclamation-sign", {
                "aria-hidden": true
            }),
            text,
        ])
    ]);
}

export function bsActivatePopovers(parent: Element) {
    $(parent).find("[data-toggle=popover]").popover({trigger: "hover"});
}

export function bsActivateTooltips(parent: Element) {
    $(parent).find("[data-toggle=tooltip]").tooltip();
}

export function bsPopover(
    title: string,
    content: string,
    placement = "bottom"
): VNode {
    return h("a", {
        "href": "#",
        "data-content": content,
        "data-placement": placement,
        "data-toggle": "popover",
        "title": title,
    }, [
        h("sup", ["?"]),
    ]);
}

export function bsTooltip(
    content: string,
    placement: string = "bottom"
): VNode {
    return h("a", {
        "href": "#",
        "data-toggle": "tooltip",
        "data-placement": placement,
        "title": content
    }, [
        h("sup", ["?"]),
    ]);
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

    return transform.replace(/[^0-9\.,]/g, "").split(",").map(s => Number(s));
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
function setTransform(
    element: Element,
    transform: string,
    nums: Number[]
) {
    let unit = "";
    if (element instanceof HTMLElement) {
        unit = "px";
    }
    const sep = `${unit},`
    const str = `${transform}(${nums.join(sep)}${unit})`

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
    f: number,
) {
    setTransform(element, "matrix", [a, b, c, d, e, f]);
}

export function setScale(element: Element, x: number, y: number) {
    setTransform(element, "scale", [x, y]);
}

export function setTranslate(element: Element, x: number, y: number) {
    setTransform(element, "translate", [x, y]);
}
