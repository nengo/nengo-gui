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

    get aspectResize(): boolean {
        return this.getBool("aspectResize", false);
    }

    set aspectResize(val: boolean) {
        this.setAny("aspectResize", val);
    }

    get autoUpdate(): boolean {
        return this.getBool("autoUpdate", true);
    }

    set autoUpdate(val: boolean) {
        this.setAny("autoUpdate", val);
    }

    get consoleHeight(): number {
        return this.getNumber("consoleHeight", 100);
    }

    set consoleHeight(val: number) {
        this.setAny("consoleHeight", val);
    }

    get editorFontSize(): number {
        return this.getNumber("editorFontSize", 12);
    }

    set editorFontSize(val: number) {
        this.setAny("editorFontSize", val);
    }

    get editorWidth(): number {
        return this.getNumber("editorWidth", 580);
    }

    set editorWidth(val: number) {
        this.setAny("editorWidth", val);
    }

    get fontSize(): number {
        return this.getNumber("fontSize", 100);
    }

    set fontSize(val: number) {
        this.setAny("fontSize", val);
    }

    get hideEditor(): boolean {
        return this.getBool("hideEditor", false);
    }

    set hideEditor(val: boolean) {
        this.setAny("hideEditor", val);
    }

    get scriptdir(): string {
        return this.getString("scriptdir", ".");
    }

    set scriptdir(val: string) {
        this.setAny("scriptdir", val);
    }

    get transparentNets(): boolean {
        return this.getBool("transparentNets", false);
    }

    set transparentNets(val: boolean) {
        this.setAny("transparentNets", val);
    }

    get zoomFonts(): boolean {
        return this.getBool("zoomFonts", false);
    }

    set zoomFonts(val: boolean) {
        this.setAny("zoomFonts", val);
    }

    restoreDefaults() {
        Object.keys(this).forEach(option => {
            this.storage.removeItem("ng." + option);
        });
    }

    private getBool(key: string, defaultVal: boolean = null) {
        const val = this.getString(key) || defaultVal;
        return val === "true" || val === true;
    }

    private getNumber(key: string, defaultVal: number = null) {
        return Number(this.getString(key) || defaultVal);
    }

    private getString(key: string, defaultVal: string = null) {
        return this.storage.getItem("ng." + key) || defaultVal;
    }

    private setAny(key: string, val: any) {
        this.storage.setItem("ng." + key, val);
    }
}

export const config = new Config();
