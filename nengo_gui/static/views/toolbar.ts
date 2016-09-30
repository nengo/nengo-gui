import { VNode, dom, h } from "maquette";

function button(
    id: string,
    icon: string,
    title: string,
    aClasses: string[] = []
): VNode {
    const classes = ["glyphicon", "glyphicon-" + icon].concat(aClasses);
    return h("li#" + id, {role: "presentation"}, [
        h("a." + classes.join("."), {title: title}),
    ]);
}

class Toolbar {
    node: VNode;
    root: HTMLElement;

    constructor() {
        this.node =
            h("div#top_toolbar_div", [
                h("ul.nav.nav-pills#toolbar_object", [
                    button("Open_file_button", "folder-open", "Open file"),
                    button("Config_menu", "wrench", "Utilities"),
                    button(
                        "Reset_layout_button",
                        "trash",
                        "Reset model layout"
                    ),
                    button(
                        "Undo_last_button",
                        "share-alt",
                        "Undo last",
                        ["reversed"]
                    ),
                    button("Redo_last_button", "share-alt", "Redo last"),
                    button("Help_button", "question-sign", "List of hotkeys"),
                    button("Toggle_ace", "list-alt", "Open code editor"),
                    button("Font_decrease", "zoom-out", "Decrease font size"),
                    button("Font_increase", "zoom-in", "Increase font size"),
                    button("Save_file", "floppy-save", "Save file"),
                    button(
                        "Sync_editor_button",
                        "circle-arrow-left",
                        "Sync diagram with editor"
                    ),
                    h("li", {role: "presentation"}, [h("div#filename")]),
                ]),
            ]);

        this.root = dom.create(this.node).domNode as HTMLElement;
    }
}
