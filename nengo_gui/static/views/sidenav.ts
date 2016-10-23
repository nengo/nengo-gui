import { VNode, dom, h } from "maquette";

function pTitle(text: string): VNode {
    return h("p.title", [text]);
}

function pIcon(glyphicon: string): VNode {
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
                                pTitle("Configure Settings"),
                                pIcon("cog"),
                            ]),
                            h("div.accordion-toggle", [
                                pTitle("Download"),
                                pIcon("chevron-down"),
                            ]),
                            h("div.accordion-content", [
                                h("div.side-menu-item.indent#Download_button", [
                                    pTitle("Download Simulation Data"),
                                    pIcon("signal"),
                                ]),
                                h("div.side-menu-item.indent#Pdf_button", [
                                    pTitle("Export layout as SVG"),
                                    pIcon("picture"),
                                ]),
                            ]),
                            h("div.side-menu-item#Minimap_button", [
                                pTitle("Minimap"),
                                pIcon("credit-card"),
                            ]),
                        ]),
                    ]),
                ]),
            ]);

        this.root = dom.create(this.node).domNode as HTMLElement;
    }
}
