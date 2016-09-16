import { VNode, dom, h } from "maquette";

function p_title(text: string): VNode {
    return h("p.title", [text]);
}

function p_icon(glyphicon: string): VNode {
    return h("p.icon", [
        h("span.glyphicon.glyphicon-" + glyphicon),
    ]);
}

class SideNav {
    node: VNode;
    root: HTMLElement;

    constructor() {
        this.node =
            h("div.sidenav-container#sidenav", [
                h("div#Menu_content", [
                    h("div.tab-content", [
                        h("div#filebrowser"),
                    ]),
                    h("div.tab-content", [
                        h("div.accordion-container#accordion-container1", [
                            h("div.side-menu-item#Config_button", [
                                p_title("Configure Settings"),
                                p_icon("cog"),
                            ]),
                            h("div.accordion-toggle", [
                                p_title("Download"),
                                p_icon("chevron-down"),
                            ]),
                            h("div.accordion-content", [
                                h("div.side-menu-item.indent#Download_button", [
                                    p_title("Download Simulation Data"),
                                    p_icon("signal"),
                                ]),
                                h("div.side-menu-item.indent#Pdf_button", [
                                    p_title("Export layout as SVG"),
                                    p_icon("picture"),
                                ]),
                            ]),
                            h("div.side-menu-item#Minimap_button", [
                                p_title("Minimap"),
                                p_icon("credit-card"),
                            ]),
                        ]),
                    ]),
                ]),
            ]);

        this.root = dom.create(this.node).domNode as HTMLElement;
    }
}
