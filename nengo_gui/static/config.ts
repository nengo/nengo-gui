import { VNode, dom, h } from "maquette";
import { ModalView } from "./modal";

/**
 * A class that takes the place of localStorage if it doesn't exist.
 *
 * Note that this does not aim to implements the whole localStorage spec;
 * it only implements what Config uses. The values set in this object will
 * only exist for the current session and will not persist across sessions.
 */
class MockLocalStorage implements Storage {
    [key: string]: any;
    items: { [key: string]: string } = {};

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

    get backend(): string {
        return this.getString("backend", "nengo");
    }

    set backend(val: string) {
        this.setAny("backend", val);
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

    get fontPercent(): number {
        return this.getNumber("fontPercent", 100);
    }

    set fontPercent(val: number) {
        this.setAny("fontPercent", val);
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
        return this.storage.getItem(`ng.${key}`) || defaultVal;
    }

    private setAny(key: string, val: any) {
        if (this.getString(key) !== String(val)) {
            this.storage.setItem(`ng.${key}`, val);
            document.dispatchEvent(
                new CustomEvent("nengoConfigChange", {
                    detail: key
                })
            );
        } else {
            console.log(`'${key}' already set to ${val}`);
        }
    }
}

export const config = new Config();

// The following classes deal with the rendering of config items in the UI

export class ConfigItem {
    help: string;
    key: string;
    label: string;
    update: (event: Event) => void;

    constructor(
        key: string,
        label: string,
        update: (event: Event) => void = null,
        help: string = null
    ) {
        this.help = help;
        this.key = key;
        this.label = label;
        this.update = update;
        if (this.update === null) {
            this.update = (event: Event) => {
                this.defaultUpdate(event);
            };
        }
    }

    defaultUpdate(event: Event) {
        const el = event.target as HTMLElement;
        const eltype = el.getAttribute("type");
        if (el instanceof HTMLInputElement && eltype === "checkbox") {
            config[this.key] = el.checked;
        } else if (
            el instanceof HTMLInputElement ||
            el instanceof HTMLSelectElement
        ) {
            config[this.key] = el.value;
        }
    }

    setView(element: HTMLInputElement | HTMLSelectElement) {
        element.value = config[this.key];
    }
}

export class CheckboxItem extends ConfigItem {
    setView(element: HTMLInputElement | HTMLSelectElement) {
        if (element instanceof HTMLInputElement) {
            element.checked = config[this.key];
        }
    }
}

export class ComboboxItem extends ConfigItem {
    options: string[];

    constructor(
        key: string,
        label: string,
        options: string[],
        update: (event: Event) => void = null,
        help: string = null
    ) {
        super(key, label, update, help);
        this.options = options;
    }
}

export class TextItem extends ConfigItem {
    attributes: any;

    constructor(
        key: string,
        label: string,
        update: (event: Event) => void = null,
        help: string = null,
        attributes: any = {}
    ) {
        super(key, label, update, help);
        this.attributes = attributes;
        this.attributes["type"] = "text";
    }
}

export class NumberItem extends TextItem {
    unit: string;

    constructor(
        key: string,
        label: string,
        unit: string = "",
        update: (event: Event) => void = null,
        help: string = null,
        attributes: any = {}
    ) {
        super(key, label, update, help, attributes);
        this.unit = unit;
        this.attributes["type"] = "number";
    }
}

export const configItems = [
    new NumberItem(
        "fontPercent",
        "Font size",
        "%",
        null,
        "As a percentage of base size",
        {
            "data-error": "Must be within 20–999 percent base size",
            max: 999,
            maxlength: 3,
            min: 20,
            required: true,
            step: 1
        }
    ),
    new CheckboxItem("zoomFonts", "Scale text when zooming"),
    new CheckboxItem(
        "aspectResize",
        "Fix aspect ratio of elements on canvas resize"
    ),
    new CheckboxItem(
        "autoUpdate",
        "Automatically synchronize model with editor",
        event => {
            const el = event.target as HTMLInputElement;
            config.autoUpdate = el.checked;
            // Also modify editor.updateTrigger?
        }
    ),
    new CheckboxItem("transparentNets", "Expanded networks are transparent"),
    new TextItem(
        "scriptdir",
        "Script directory",
        null,
        "Enter a full absolute path, or '.' to use the current directory.",
        {
            placeholder: "Current directory"
        }
    ),
    new ComboboxItem("backend", "Select backend", ["nengo"])
    // TODO: this.sim.simulatorOptions
];

export class ConfigDialog {
    saved: any = {};
    view: ConfigDialogView = new ConfigDialogView(configItems);

    constructor() {
        this.view.ok.addEventListener("click", () => {
            const validator = $(this.view.form).data("bs.validator");
            validator.validate();
            if (validator.hasErrors() || validator.isIncomplete()) {
                return;
            }
            // Set the data-dismiss attribute and let event propagate
            $(this.view).modal("hide");
        });

        this.view.cancel.addEventListener("click", () => {
            // Roll back any changes
            Object.keys(this.saved).forEach(option => {
                if (config[option] !== this.saved[option]) {
                    config[option] = this.saved[option];
                }
            });
        });

        this.view.configItems.forEach((configItem, i) => {
            // Allow the enter key to submit on text/number inputs
            const inputType = configItem.getAttribute("type");
            if (inputType === "text" || inputType === "number") {
                configItem.addEventListener(
                    "keydown",
                    (event: KeyboardEvent) => {
                        if (event.which === 13) {
                            event.preventDefault();
                            this.view.ok.click();
                        }
                    }
                );
            }
            // All inputs get updated live
            configItem.addEventListener("change", event => {
                const validator = $(this.view.form).data("bs.validator");
                validator.validate();
                if (!validator.hasErrors()) {
                    configItems[i].update(event);
                }
            });
        });

        $(this.view.form).validator();
    }

    show() {
        // Save values from before showing the modal for restoring after cancel
        for (const option in config) {
            const vType = typeof config[option];
            if (
                vType === "number" ||
                vType === "boolean" ||
                vType === "string"
            ) {
                this.saved[option] = config[option];
            }
        }

        // Set values as of current config state
        configItems.forEach((configItem, i) => {
            configItem.setView(this.view.configItems[i]);
        });
        const validator = $(this.view.form).data("bs.validator");
        validator.validate();
        this.view.show();
    }
}

export class ConfigDialogView extends ModalView {
    cancel: HTMLButtonElement;
    configItems: (HTMLInputElement | HTMLSelectElement)[];
    form: HTMLFormElement;
    ok: HTMLButtonElement;

    constructor(configItems: ConfigItem[]) {
        super();

        const checkboxGroup = (configItem: CheckboxItem) => {
            return h("div.form-group.checkbox", [
                h("label.control-label", [
                    h("input", {
                        type: "checkbox"
                    }),
                    configItem.label
                ]),
                h("span.help-block.with-errors", [configItem.help])
            ]);
        };

        const comboboxGroup = (configItem: ComboboxItem) => {
            return h("div.form-group", [
                h("label.control-label", [
                    configItem.label,
                    h("select.form-control", configItem.options)
                ]),
                h("span.help-block.with-errors", [configItem.help])
            ]);
        };

        const numberGroup = (configItem: NumberItem) => {
            return h("div.form-group", [
                h("label.control-label", [
                    configItem.label,
                    h("div.input-group.col-xs-3", [
                        h("input.form-control", configItem.attributes),
                        h("span.input-group-addon", [configItem.unit])
                    ])
                ]),
                h("span.help-block.with-errors", [configItem.help])
            ]);
        };

        const textGroup = (configItem: TextItem) => {
            return h("div.form-group", [
                h("label.control-label", [
                    configItem.label,
                    h("input.form-control", configItem.attributes)
                ]),
                h("span.help-block.with-errors", [configItem.help])
            ]);
        };

        const node = h("form.form-horizontal", [
            configItems.map(configItem => {
                if (configItem instanceof CheckboxItem) {
                    return checkboxGroup(configItem);
                } else if (configItem instanceof ComboboxItem) {
                    return comboboxGroup(configItem);
                } else if (configItem instanceof NumberItem) {
                    // Must check NumberItem first as it extends TextItem
                    return numberGroup(configItem);
                } else if (configItem instanceof TextItem) {
                    return textGroup(configItem);
                } else {
                    throw new TypeError("ConfigItem not recognized.");
                }
            })
        ]);

        this.form = dom.create(node).domNode as HTMLFormElement;
        this.body.appendChild(this.form);

        this.title = "Configure options";
        this.ok = this.addFooterButton("OK");
        this.cancel = this.addCloseButton("Cancel");

        const groups = this.body.getElementsByClassName("form-group");
        this.configItems = [];
        for (let i = 0; i < groups.length; i++) {
            this.configItems[i] = groups[i].querySelector("input");
            if (this.configItems[i] === null) {
                this.configItems[i] = groups[i].querySelector("select");
            }
            console.assert(this.configItems[i] !== null);
        }
    }

    show() {
        $(this.root).modal("show");
        $(this.root).on("shown.bs.modal", () => {
            this.configItems[0].focus();
        });
    }
}
