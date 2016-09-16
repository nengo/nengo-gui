/**
 * A class that takes the place of localStorage if it doesn't exist.
 *
 * Note that this does not aim to implements the whole localStorage spec;
 * it only implements what Config uses. The values set in this object will
 * only exist for the current session and will not persist across sessions.
 */
class MockLocalStorage implements Storage {

    [key: string]: any;
    items: {[key: string]: string} = {};

    get length(): number {
        return Object.keys(this.items).length;
    }

    clear() {
        this.items = {};
    }

    getItem(name: string): string {
        return this.items[name];
    }

    key(index: number) {
        return Object.keys(this.items)[index];
    }

    removeItem(name: string): void {
        delete this.items[name];
    }

    setItem(name: string, val: any): void {
        this.items[name] = String(val);
    }
}

class Config {
    storage: Storage;

    constructor() {
        if (typeof localStorage === "undefined" || localStorage === null) {
            this.storage = new MockLocalStorage();
        } else {
            this.storage = localStorage;
        }
    }

    get aspect_resize(): boolean {
        return this.get_bool("aspect_resize", false);
    }

    set aspect_resize(val: boolean) {
        this.set_any("aspect_resize", val);
    }

    get auto_update(): boolean {
        return this.get_bool("auto_update", true);
    }

    set auto_update(val: boolean) {
        this.set_any("auto_update", val);
    }

    get console_height(): number {
        return this.get_number("console_height", 100);
    }

    set console_height(val: number) {
        this.set_any("console_height", val);
    }

    get editor_font_size(): number {
        return this.get_number("editor_font_size", 12);
    }

    set editor_font_size(val: number) {
        this.set_any("editor_font_size", val);
    }

    get editor_width(): number {
        return this.get_number("editor_width", 580);
    }

    set editor_width(val: number) {
        this.set_any("editor_width", val);
    }

    get font_size(): number {
        return this.get_number("font_size", 100);
    }

    set font_size(val: number) {
        this.set_any("font_size", val);
    }

    get hide_editor(): boolean {
        return this.get_bool("hide_editor", false);
    }

    set hide_editor(val: boolean) {
        this.set_any("hide_editor", val);
    }

    get scriptdir(): string {
        return this.get_string("scriptdir", ".");
    }

    set scriptdir(val: string) {
        this.set_any("scriptdir", val);
    }

    get transparent_nets(): boolean {
        return this.get_bool("transparent_nets", false);
    }

    set transparent_nets(val: boolean) {
        this.set_any("transparent_nets", val);
    }

    get zoom_fonts(): boolean {
        return this.get_bool("zoom_fonts", false);
    }

    set zoom_fonts(val: boolean) {
        this.set_any("zoom_fonts", val);
    }

    restore_defaults() {
        Object.keys(this).forEach(option => {
            this.storage.removeItem("ng." + option);
        });
    }

    private get_bool(key: string, default_val: boolean = null) {
        const val = this.get_string(key) || default_val;
        return val === "true" || val === true;
    }

    private get_number(key: string, default_val: number = null) {
        return Number(this.get_string(key) || default_val);
    }

    private get_string(key: string, default_val: string = null) {
        return this.storage.getItem("ng." + key) || default_val;
    }

    private set_any(key: string, val: any) {
        this.storage.setItem("ng." + key, val);
    }
}

export const config = new Config();
