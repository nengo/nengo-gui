import { MockConnection } from "../server";

// main
import { ConfigDialog, configItems } from "../config";
import { Editor } from "../editor";
import { HotkeyManager } from "../hotkeys";
import { Menu } from "../menu";
import { NetGraph } from "../netgraph/main";
import { Sidebar } from "../sidebar";
import { SimControl } from "../sim-control";
import { Toolbar } from "../toolbar";

// views
import { ConfigDialogView } from "../config";
import { NetGraphView } from "../netgraph/view";
import { EditorView } from "../editor";
import { HotkeysDialogView } from "../hotkeys";
import { MenuView } from "../menu";
import { AlertDialogView, InputDialogView, ModalView } from "../modal";
import { SidebarView } from "../sidebar";
import { SimControlView } from "../sim-control";
import { ToolbarView } from "../toolbar";

// components
import { Ensemble } from "../components/ensemble";
import { Network } from "../components/network";
import { Node, PassthroughNode } from "../components/node";
import { Position } from "../components/position";
import { Raster } from "../components/raster";
import { Slider } from "../components/slider";
import { Value } from "../components/value";
import { XYValue } from "../components/xyvalue";

// component views
import {
    ConnectionView,
    RecurrentConnectionView
} from "../components/connection";
import { EnsembleView } from "../components/ensemble";
import { NetworkView } from "../components/network";
import { NodeView, PassthroughNodeView } from "../components/node";

export const listeners = {
    ConfigDialog: null
};

export const main = {
    ConfigDialog: () => {
        const cd = new ConfigDialog();
        if (this.listeners.ConfigDialog === null) {
            this.listeners.ConfigDialog = (e: CustomEvent) => {
                console.log(e.detail + " changed");
            };
            document.addEventListener(
                "nengoConfigChange",
                this.listeners.ConfigDialog
            );
        }
        cd.show();
        return cd;
    },
    Editor: () => {
        return new Editor(new MockConnection());
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
    Sidebar: () => new Sidebar(new MockConnection()),
    SimControl: () => new SimControl(new MockConnection(), 4.0, [-1.0, 0.0]),
    Toolbar: () => {
        const tb = new Toolbar(new MockConnection());
        tb.filename = "test.py";
        return tb;
    }
};

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
    HotkeysDialogView: () => {
        const m = new HotkeyManager(new MockConnection());
        m.add("Test ctrl", "a", { ctrl: true }, () => {});
        m.add("Test shift", "b", { shift: true }, () => {});
        m.add("Test both", "c", { ctrl: true, shift: true }, () => {});
        const hk = new HotkeysDialogView(m.hotkeys);
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
    SidebarView: () => new SidebarView(),
    SimControlView: () => new SimControlView()
};

export const component = {
    Ensemble: () =>
        new Ensemble({
            server: new MockConnection(),
            uid: "Ensemble",
            label: "Ensemble",
            pos: new Position(20, 20, 50, 50),
            dimensions: 1
        }),
    Network: () =>
        new Network({
            server: new MockConnection(),
            uid: "Network",
            label: "Network",
            pos: new Position(20, 20, 50, 50)
        }),
    Node: () =>
        new Node({
            server: new MockConnection(),
            uid: "Node",
            label: "Node",
            pos: new Position(20, 20, 50, 50),
            dimensions: 1
        }),
    PassthroughNode: () =>
        new PassthroughNode({
            server: new MockConnection(),
            uid: "Passthrough",
            label: "Passthrough",
            pos: new Position(20, 20)
        }),
    Raster: () =>
        new Raster({
            server: new MockConnection(),
            uid: "Raster",
            label: "Raster",
            pos: new Position(20, 20, 100, 100),
            nNeurons: 2,
            synapse: 0.005
        }),
    Slider: () =>
        new Slider({
            server: new MockConnection(),
            uid: "Slider",
            label: "Slider",
            pos: new Position(20, 20, 100, 100),
            dimensions: 2,
            synapse: 0.005
        }),
    Value: () =>
        new Value({
            server: new MockConnection(),
            uid: "Value",
            label: "Value",
            pos: new Position(20, 20, 100, 100),
            dimensions: 2,
            synapse: 0.005
        }),
    XYValue: () =>
        new XYValue({
            server: new MockConnection(),
            uid: "XY Value",
            label: "XY Value",
            pos: new Position(20, 20, 100, 100),
            dimensions: 2,
            synapse: 0.005
        })
};

export const componentview = {
    ConnectionView: () => new ConnectionView(),
    EnsembleView: () => new EnsembleView(),
    NetworkView: () => new NetworkView(),
    NodeView: () => new NodeView(),
    PassthroughNodeView: () => new PassthroughNodeView(),
    RecurrentConnectionView: () => new RecurrentConnectionView()
};
