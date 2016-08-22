export default class Config {
    constructor() {
        const self = this;

        const define_option = function(key, default_val) {
            const typ = typeof(default_val);
            Object.defineProperty(self, key, {
                enumerable: true,
                get: function() {
                    const val = localStorage.getItem("ng." + key) || default_val;
                    if (typ === "boolean") {
                        return val === "true" || val === true;
                    } else if (typ === "number") {
                        return Number(val);
                    } else {
                        return val;
                    }
                },
                set: function(val) {
                    return localStorage.setItem("ng." + key, val);
                },
            });
        };

        // General options accessible through Configuration Options
        define_option("transparent_nets", false);
        define_option("aspect_resize", false);
        define_option("zoom_fonts", false);
        define_option("font_size", 100);
        define_option("scriptdir", ".");

        // Editor options
        define_option("hide_editor", false);
        define_option("editor_width", 580);
        define_option("editor_font_size", 12);
        define_option("auto_update", true);
        define_option("console_height", 100);
    };

    restore_defaults() {
        for (let option in this) {
            if (this.hasOwnProperty(option)) {
                localStorage.removeItem("ng." + option);
            }
        }
    };
}
