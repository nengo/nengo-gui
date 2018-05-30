/**
 * Simple JavaScript status bar which is used at the bottom of the net graph
 * window.
 *
 * Creates a global instance Nengo.status_bar inside the netgraph which can be
 * accessed using the following functions:
 * - Nengo.status_bar.set_caption()
 * - Nengo.status_bar.get_caption()
 * - Nengo.status_bar.hide()
 * - Nengo.status_bar.show()
 */

Nengo.StatusBar = (function () {
    "use strict";

    /**
     * StatusBar constructor. Instantiates the DOM for the status bar and
     * attaches it to the given parent DOM element.
     *
     * @param parent is the DOM node the StatusBar should be attached to.
     */
    var StatusBar = function(parent) {
        "use strict";

        // Create the component by manually assembling the DOM, attach to parent
        this.status_bar_div = document.createElement('div');
        this.status_bar_div.classList.add('status_bar');
        parent.appendChild(this.status_bar_div);

        // Timeout handle used in the set_caption member function
        this.caption_update_timeout = null;
    };

    /**
     * Sets the status bar caption. Does so asynchronously in the next event
     * processing loop to prevent performance-heavy DOM manipulations. This way
     * this function can be called with an extremly high frequency without
     * unnecessarily impacting performance.
     */
    StatusBar.prototype.set_caption = function(caption) {
        var self = this;

        // If there already is a timeout scheduled, cancel that timeout.
        if (this.caption_update_timeout) {
            window.clearTimeout(this.caption_update_timeout);
            this.caption_update_timeout = null;
        }

        // Update the text content with a delay, only do this if the caption
        // has actually changed.
        if (self.status_bar_div.textContent != caption) {
            this.caption_update_timeout = window.setTimeout(function() {
                self.status_bar_div.textContent = caption;
                self.caption_update_timeout = null;
            }, 1);
        }
    }

    /**
     * Returns the status bar caption.
     */
    StatusBar.prototype.get_caption = function() {
        return this.status_bar_div.textContent;
    }

    /**
     * Hides the status bar from view without removing it from the DOM.
     */
    StatusBar.prototype.hide = function() {
        this.status_bar_div.style.visibility = "hidden";
    }

    /**
     * Displays the status bar.
     */
    StatusBar.prototype.show = function() {
        this.status_bar_div.style.visibility = "visible";
    }

    return StatusBar;
})();

/**
 * Create a global instance of the StatusBar.
 */
(function () {
    "use strict";

    Nengo.status_bar = new Nengo.StatusBar(document.querySelector("#control"));
    Nengo.status_bar.set_caption("Welcome to Nengo GUI.");
})();
