/**
 * Manages hotkeys.
 *
 * @constructor
 */

import { Editor } from "./editor";
import { NetGraph } from "./netgraph";
import { Connection } from "./server";
import { SimControl } from "./sim-control"
import { HotkeysDialogView } from "./views/hotkeys";

export type Modifiers = {ctrl?: boolean, shift?: boolean};
export type HotkeyCallback = (event: KeyboardEvent) => void;

export class Hotkey {
    static ctrl = "Ctrl";
    static shift = "Shift";

    callback: HotkeyCallback;
    key: string;
    name: string | null;
    modifiers: Modifiers = {ctrl: false, shift: false};

    constructor(
        name: string | null,
        key: string,
        modifiers: Modifiers,
        callback: HotkeyCallback
    ) {
        this.name = name;
        this.key = key;
        for (const modifier in modifiers) {
            this.modifiers[modifier] = modifiers[modifier];
        }
        this.callback = callback;
    }

    get shortcut(): string {
        let shortcut = this.key;
        if (this.modifiers.shift) {
            shortcut = Hotkey.shift + "-" + shortcut;
        }
        if (this.modifiers.ctrl) {
            shortcut = Hotkey.ctrl + "-" + shortcut;
        }
        return shortcut;
    }

    check(key: string, modifiers: Modifiers) {
        const modEqual = Object.getOwnPropertyNames(modifiers).every(mod => {
            return this.modifiers[mod] === modifiers[mod];
        });
        return this.key.toLowerCase() === key.toLowerCase() && modEqual;
    }

}

if (navigator.userAgent.toLowerCase().indexOf("mac") > -1) {
    Hotkey.ctrl = "⌘";
    Hotkey.shift = "⇧";
}

export class HotkeyManager {
    hotkeys: Hotkey[] = [];

    active: boolean = true;

    private server: Connection;

    constructor(server: Connection) {
        document.addEventListener("keydown", event => {
            this.onkeydown(event);
        });

        // Bring up help menu with ?
        this.add("Show hotkeys", "?", () => { this.show();  });
        // Prevent going back in history.
        this.add(null, "backspace", () => {});

        server.bind("hotkeys.show", () => { this.show(); });
        this.server = server;
    }

    add(name: string, key: string, ...args: (Modifiers | HotkeyCallback)[]) {
        let modifiers: Modifiers = {};
        let callback: HotkeyCallback;
        if (args.length === 1) {
            callback = args[0] as HotkeyCallback;
        } else if (args.length === 2) {
            modifiers = args[0] as Modifiers;
            callback = args[1] as HotkeyCallback;
        } else {
            throw new TypeError(
                "Expected 2 or 3 arguments. Got " + arguments.length + "."
            );
        }
        this.hotkeys.push(new Hotkey(name, key, modifiers, callback));
    }

    onkeydown(event: KeyboardEvent) {
        // TODO: Right now, we ignore all hotkeys when focused on the editor.
        //       previously only some of these were ignored.
        //       Is it worth making this possible again?

        const onEditor =
            (<Element> event.target).className === "ace_text-input";

        if (!this.active || onEditor) {
            return;
        }

        const ctrl = event.ctrlKey || event.metaKey;
        const shift = event.shiftKey;
        let key;
        if (event.hasOwnProperty("key")) {
            key = event.key;
        } else {
            if (event.keyCode === 191) {
                key = "?";
            } else if (event.keyCode === 8) {
                key = "backspace";
            } else if (event.keyCode === 13) {
                key = "enter";
            } else {
                key = String.fromCharCode(event.keyCode);
            }
        }
        key = key.toLowerCase();

        // Using Array.some to iterate through hotkeys, stopping when a
        // check returns true. Like forEach with `break`.
        this.hotkeys.some(hk => {
            const check = hk.check(key, {ctrl: ctrl, shift: shift});
            if (check) {
                hk.callback(event);
                event.preventDefault();
            }
            return check
        });
    }

    show() {
        const modal = new HotkeysDialogView(this.hotkeys);
        $(modal.root).on("hidden.bs.modal", () => {
            document.body.removeChild(modal.root);
        });
        document.body.appendChild(modal.root);
        modal.show();
    }
}
