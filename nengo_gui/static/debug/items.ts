import { MockConnection } from "../websocket";

// main
import { ConfigDialog, configItems } from "../config";
import { Editor } from "../editor";
import { HotkeyManager } from "../hotkeys";
import { Menu } from "../menu";
import { NetGraph } from "../netgraph";
import { UtilitiesSidebar } from "../sidebar";
import { SimControl } from "../sim-control";
import { Toolbar } from "../toolbar";

// views
import { ConfigDialogView } from "../views/config";
import { NetGraphView } from "../views/netgraph";
import { EditorView } from "../views/editor";
import { HotkeysDialogView } from "../views/hotkeys";
import { MenuView } from "../views/menu";
import { AlertDialogView, InputDialogView, ModalView } from "../views/modal";
import { FilebrowserView, UtilitiesView } from "../views/sidebar";
import { SimControlView } from "../views/sim-control";
import { ToolbarView } from "../views/toolbar";

// components
import { Ensemble } from "../components/ensemble";
import { Node, PassthroughNode } from "../components/node";

// component views
import { EnsembleView } from "../components/views/ensemble";
import { NodeView, PassthroughNodeView } from "../components/views/node";

export const listeners = {
    ConfigDialog: null,
}

export const main = {
    ConfigDialog: () => {
        const cd = new ConfigDialog();
        if (this.listeners.ConfigDialog === null) {
            this.listeners.ConfigDialog = (e: CustomEvent) => {
                console.log(e.detail + " changed");
            };
            document.addEventListener(
                "nengoConfigChange", this.listeners.ConfigDialog,
            );
        }
        cd.show();
        return cd;
    },
    Editor: () => {
        return new Editor(null);
    },
    Menu: () => {
        const menu = new Menu();
        menu.addAction("Action 1.1", () => console.log("Action 1.1"));
        menu.addHeader("Hidden");
        menu.addAction("Hidden", () => false, () => false);
        menu.addSeparator();
        menu.addAction("Action 2.1", () => console.log("Action 2.1"));
        menu.show(0, 0);
        return menu;
    },
    SimControl: () => {
        const sc = new SimControl("uid", 4.0, 0.5);
        sc.attach(new MockConnection());
        return sc;
    },
    Toolbar: () => new Toolbar("test.py"),
    UtilitiesSidebar: () => new UtilitiesSidebar(),
}

export const view = {
    AlertDialogView: () => {
        const a = new AlertDialogView("Test text");
        a.show();
        return a;
    },
    ConfigDialogView: () => {
        const cd = new ConfigDialogView(configItems);
        cd.show();
        return cd;
    },
    EditorView: () => {
        return new EditorView();
    },
    FilebrowserView: () => new FilebrowserView(),
    HotkeysDialogView: () => {
        const m = new HotkeyManager();
        m.add("Test ctrl", "a", {ctrl: true}, () => {});
        m.add("Test shift", "b", {shift: true}, () => {});
        m.add("Test both", "c", {ctrl: true, shift: true}, () => {});
        const hk = new HotkeysDialogView(m);
        hk.show();
        return hk;
    },
    InputDialogView: () => {
        const i = new InputDialogView("0.5", "Test label");
        i.show();
        return i;
    },
    MenuView: () => {
        const menu = new MenuView();
        menu.addAction("Action 1");
        menu.addHeader("Subactions");
        menu.addAction("Action 1.1");
        menu.addAction("Action 1.2");
        menu.addSeparator();
        menu.addAction("Action 2.1");
        return menu;
    },
    ModalView: () => {
        const mv = new ModalView();
        mv.show();
        return mv;
    },
    ToolbarView: () => new ToolbarView(),
    SimControlView: () => new SimControlView(),
    UtilitiesView: () => new UtilitiesView(),
};

export const component = {
    Ensemble: () => new Ensemble(20, 20, 50, 50, "", "Ensemble", 1),
    Node: () => new Node(20, 20, 50, 50, "", "Node", 1),
    PassthroughNode: () => new PassthroughNode(20, 20, 50, 50, "", "Passthrough", 1),
}

export const componentview = {
    EnsembleView: () => new EnsembleView("Ensemble"),
    NodeView: () => new NodeView("Node"),
    PassthroughNodeView: () => new PassthroughNodeView("PassthroughNode"),
}
