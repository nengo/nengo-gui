/**
 * A class that takes the place of localStorage if it doesn't exist.
 *
 * Note that this does not aim to implements the whole localStorage spec;
 * it only implements what Config uses. The values set in this object will
 * only exist for the current session and will not persist across sessions.
 */
class MockLocalStorage {
    items: any;

    constructor() {
        this.items = {};
    }

    getItem(key: string) {
        return this.items[key];
    }

    removeItem(key: string) {
        delete this.items[key];
    }

    setItem(key: string, val: any) {
        this.items[key] = String(val);
    }
}

/* tslint:disable:no-typeof-undefined */

export default class Config {
    localStorage;

    constructor() {
        if (typeof localStorage === "undefined" || localStorage === null) {
            this.localStorage = new MockLocalStorage();
        } else {
            this.localStorage = localStorage;
        }

        const define_option = (key, default_val) => {
            const typ = typeof(default_val);
            Object.defineProperty(this, key, {
                enumerable: true,
                get: () => {
                    const val =
                        this.localStorage.getItem("ng." + key) || default_val;
                    if (typ === "boolean") {
                        return val === "true" || val === true;
                    } else if (typ === "number") {
                        return Number(val);
                    } else {
                        return val;
                    }
                },
                set: val => {
                    return this.localStorage.setItem("ng." + key, val);
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
    }

    restore_defaults() {
        Object.keys(this).forEach(option => {
            this.localStorage.removeItem("ng." + option);
        });
    }
}
