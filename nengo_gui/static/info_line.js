/**
 * Simple JavaScript info line which is used in the status bar at the bottom
 * of the window.
 *
 * Creates a global instance Nengo.info_line inside the netgraph which can be
 * accessed using the following functions:
 * - Nengo.info_line.set_caption()
 * - Nengo.info_line.get_caption()
 * - Nengo.info_line.hide()
 * - Nengo.info_line.show()
 */

Nengo.InfoLine = (function () {
    "use strict";

    /**
     * InfoLine constructor. Instantiates the DOM for the info line and
     * attaches it to the given parent DOM element.
     *
     * @param parent is the DOM node the InfoLine should be attached to.
     */
    var InfoLine = function(parent) {
        "use strict";

        // Create the component by manually assembling the DOM, attach to parent
        this.info_line_div = document.createElement('div');
        this.info_line_div.classList.add('infoline');
        parent.appendChild(this.info_line_div);

        // Timeout handle used in the set_caption member function
        this.caption_update_timeout = null;
    };

    /**
     * Sets the info line caption. Does so asynchronously in the next event
     * processing loop to prevent performance-heavy DOM manipulations. This way
     * this function can be called with an extremely high frequency without
     * unnecessarily impacting performance.
     */
    InfoLine.prototype.set_caption = function(caption) {
        var self = this;

        // If there already is a timeout scheduled, cancel that timeout.
        if (this.caption_update_timeout) {
            window.clearTimeout(this.caption_update_timeout);
            this.caption_update_timeout = null;
        }

        // Update the text content with a delay, only do this if the caption
        // has actually changed.
        if (self.info_line_div.textContent != caption) {
            this.caption_update_timeout = window.setTimeout(function() {
                self.info_line_div.textContent = caption;
                self.caption_update_timeout = null;
            }, 1);
        }
    }

    /**
     * Returns the info line caption.
     */
    InfoLine.prototype.get_caption = function() {
        return this.info_line_div.textContent;
    }

    /**
     * Hides the info line from view without removing it from the DOM.
     */
    InfoLine.prototype.hide = function() {
        this.info_line_div.style.visibility = "hidden";
    }

    /**
     * Displays the info line.
     */
    InfoLine.prototype.show = function() {
        this.info_line_div.style.visibility = "visible";
    }

    return InfoLine;
})();

/**
 * Create a global instance of the InfoLine.
 */
(function () {
    "use strict";

    Nengo.info_line = new Nengo.InfoLine(document.querySelector("#statusbar"));
    Nengo.info_line.set_caption("Welcome to Nengo GUI.");
})();
