import { VNode, dom, h } from "maquette";

import { HotkeyManager } from "../hotkeys";
import { ModalView } from "./modal";

export class HotkeysDialogView extends ModalView {
    constructor(manager: HotkeyManager) {
        super();

        this.title = "Hotkeys list";
        this.dialog.classList.add("modal-sm");

        const row = (action: string, shortcut: string) => {
            return h("tr", [
                h("td", [action]),
                h("td", {align: "right"}, [shortcut])
            ]);
        }

        const node =
            h("table.table-striped", {width: "100%"}, [
                h("tbody", [
                    manager.hotkeys.map(hk => {
                        if (hk.name !== null) {
                            return row(hk.name, hk.shortcut);
                        }
                    })
                ])
            ]);

        this.body.appendChild(dom.create(node).domNode);
    }
}
