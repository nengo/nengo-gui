Nengo.Config = function(parent, args) {
    var self = this;

    define_option = function(key, default_val) {
        var type = typeof(default_val);
        Object.defineProperty(self, key, {
            get: function() {
                var val = localStorage.getItem("ng." + key) || default_val;
                if (type === "boolean") {
                    return val === "true" || val === true;
                } else if (type === "number") {
                    return Number(val);
                } else {
                    return val;
                }
            },
            set: function(val) {
                return localStorage.setItem("ng." + key, val);
            },
            enumerable: true
        });
    };

    // General options accessible through Configuration Options
    define_option("transparent_nets", false);
    define_option("aspect_resize", false);
    define_option("zoom_fonts", false);
    define_option("font_size", 100);
    define_option("scriptdir", ".");

    // Ace editor options
    define_option("hide_editor", false);
    define_option("editor_width", 580);
    define_option("editor_font_size", 12);
    define_option("auto_update", true);
    define_option("console_height", 100);
};

Nengo.Config.prototype.restore_defaults = function() {
    for (var option in this) {
        if (this.hasOwnProperty(option)) {
            localStorage.removeItem("ng." + option);
        }
    }
}

Nengo.config = new Nengo.Config();
