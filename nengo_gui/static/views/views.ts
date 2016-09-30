/**
 * Utility functions for views.
 */

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

/**
 * Get the transform of an element.
 */
export function getTransform(element: Element) {
    let translate;
    if (element instanceof SVGElement) {
        translate = element.getAttribute("transform");
    } else if (element instanceof HTMLElement) {
        translate = element.style.transform;
    } else {
        console.warn("'element' is not HTML or SVG in 'getTransform'");
        translate = "translate(0,0);";
    }
    console.assert(translate.startsWith("translate("));
    // Remove non-digit and non-comma characters
    translate.replace(/[^0-9,]/g, "");
    const nums = translate.split(",");
    console.assert(nums.length === 2);
    return [Number(nums[0]), Number(nums[1])];
}

/**
 * Set the transform of an element.
 *
 * @param {HTMLElement} element - The HTML element to set.
 * @param {number} x - Shift on the x-axis.
 * @param {number} y - Shift on the y-axis.
 */
export function setTransform(element: Element, x: number, y: number) {
    if (element instanceof SVGElement) {
        element.setAttribute("transform", "translate(" + x + "," + y + ")");
    } else if (element instanceof HTMLElement) {
        element.style.webkitTransform = element.style.transform =
            "translate(" + x + "px," + y + "px)";
    } else {
        console.warn("'element' is not HTML or SVG in 'setTransform'");
    }
}
