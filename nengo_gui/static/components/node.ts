import { Component, Position, ResizableComponent } from "./base";
import { registerComponent } from "./registry";
import { NodeView, PassthroughNodeView } from "./views/node";

export class PassthroughNode extends Component {
    fixedHeight: number;
    fixedWidth: number;

    protected _view: PassthroughNodeView;

    constructor({
        uid,
        pos,
        dimensions
    }: {
        uid: string;
        pos: Position;
        dimensions: number;
    }) {
        super(uid, pos.left, pos.top, dimensions);
    }

    get view(): PassthroughNodeView {
        if (this._view === null) {
            this._view = new PassthroughNodeView("?");
        }
        return this._view;
    }
}

export class Node extends ResizableComponent {
    htmlNode;

    protected _view: NodeView;

    constructor({
        uid,
        pos,
        dimensions
    }: {
        uid: string;
        pos: Position;
        dimensions: number;
    }) {
        super(uid, pos.left, pos.top, pos.width, pos.height, dimensions);
    }

    get view(): NodeView {
        if (this._view === null) {
            this._view = new NodeView("?");
        }
        return this._view;
    }

    addMenuItems() {
        this.menu.addAction("Slider", () => {
            this.createGraph("Slider");
        });
        this.menu.addAction(
            "Value",
            () => {
                this.createGraph("Value");
            },
            () => this.dimensions > 0
        );
        this.menu.addAction(
            "XY-value",
            () => {
                this.createGraph("XYValue");
            },
            () => this.dimensions > 1
        );
        this.menu.addAction(
            "HTML",
            () => {
                this.createGraph("HTMLView");
            },
            () => this.htmlNode
        );
        this.menu.addAction("Details ...", () => {
            // TODO
            // this.createModal();
        });
    }
}

registerComponent("node", Node);
