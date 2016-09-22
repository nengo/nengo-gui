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
export function safe_set_text(element: HTMLElement, text: string) {
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
export function set_transform(element: HTMLElement, x: number, y: number) {
    element.style.webkitTransform =
        element.style.transform = "translate(" + x + "px, " + y + "px)";
}
