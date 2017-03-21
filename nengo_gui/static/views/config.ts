import { VNode, dom, h } from "maquette";
import { ModalView } from "./modal";
import {
    CheckboxItem, ComboboxItem, ConfigItem, NumberItem, TextItem
} from "../config";

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
                        "type": "checkbox",
                    }),
                    configItem.label,
                ]),
                h("span.help-block.with-errors", [configItem.help]),
            ]);
        };

        const comboboxGroup = (configItem: ComboboxItem) => {
            return h("div.form-group", [
                h("label.control-label", [
                    configItem.label,
                    h("select.form-control", configItem.options),
                ]),
                h("span.help-block.with-errors", [configItem.help]),
            ]);
        };

        const numberGroup = (configItem: NumberItem) => {
            return h("div.form-group", [
                h("label.control-label", [
                    configItem.label,
                    h("div.input-group.col-xs-3", [
                        h("input.form-control", configItem.attributes),
                        h("span.input-group-addon", [configItem.unit]),
                    ]),
                ]),
                h("span.help-block.with-errors", [configItem.help]),
            ]);
        };

        const textGroup = (configItem: TextItem) => {
            return h("div.form-group", [
                h("label.control-label", [
                    configItem.label,
                    h("input.form-control", configItem.attributes),
                ]),
                h("span.help-block.with-errors", [configItem.help]),
            ]);
        };

        const node =
            h("form.form-horizontal", [
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
